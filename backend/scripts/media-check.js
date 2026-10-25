/**
 * Uploaded-media health check — run ON THE SERVER, from backend/:
 *
 *   npm run media:check
 *
 * Read-only apart from one temporary probe file it creates and deletes in
 * MEDIA_ROOT/.incoming. Checks, in the order an upload travels:
 *   1. settings (API_URL / FRONTEND_URL sanity — not secrets)
 *   2. MEDIA_ROOT exists, is writable, and is outside the deploy folder
 *   3. every media key the database references exists on disk
 *   4. a stored image loads (a) straight from Node and (b) through the public
 *      site (Nginx / Cloudflare) with an image content type
 * Prints keys/ids only — no customer data, no credentials.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { mediaStorage } from '../src/services/providers/mediaStorage.js';

let problems = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  problems++;
  console.log(`  FAIL  ${msg}`);
};
const warn = (msg) => console.log(`  warn  ${msg}`);

async function probe(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const type = res.headers.get('content-type') || '';
    await res.body?.cancel();
    return { status: res.status, type };
  } catch (error) {
    return { status: null, type: '', error: error.message };
  }
}

try {
  console.log('\n1. Settings');
  console.log(`  NODE_ENV=${env.nodeEnv} · FRONTEND_URL=${env.frontendUrl} · API_URL=${env.apiUrl}`);
  if (/localhost|127\.0\.0\.1/.test(env.apiUrl) && env.isProd) {
    warn('API_URL points at localhost. Images in API responses no longer depend on it, but server-side image links (e.g. sent to providers) do. Set API_URL=https://cardhub.co.tz/api/v1');
  } else ok('API_URL looks public');

  console.log('\n2. Storage (MEDIA_ROOT)');
  const root = mediaStorage.root;
  console.log(`  MEDIA_ROOT=${root}${process.env.MEDIA_ROOT ? '' : ' (default — MEDIA_ROOT not set)'}`);
  await mediaStorage.ensureReady();
  const probeFile = path.join(mediaStorage.tempDir, `${randomUUID()}.probe`);
  try {
    await fs.writeFile(probeFile, 'ok');
    await fs.rm(probeFile);
    ok('MEDIA_ROOT is writable by this user');
  } catch (error) {
    bad(`MEDIA_ROOT is not writable: ${error.code || error.message}`);
  }
  const deployDir = path.resolve(process.cwd(), '..');
  if (root.startsWith(deployDir + path.sep)) warn(`MEDIA_ROOT is inside the deploy folder (${deployDir}); a deploy that replaces that folder would remove uploads. Prefer e.g. /var/lib/cardhub/media.`);
  else ok('MEDIA_ROOT is outside the deploy folder');

  console.log('\n3. Database references vs files on disk');
  const [rows] = await pool.query(`
    SELECT 'event' AS kind, id, cover_image AS mkey FROM events WHERE cover_image LIKE 'media/%'
    UNION ALL SELECT 'card', id, preview_image FROM event_templates WHERE preview_image LIKE 'media/%'
    UNION ALL SELECT 'video', id, file_key FROM media_assets WHERE file_key LIKE 'media/%'
    UNION ALL SELECT 'video poster', id, poster_key FROM media_assets WHERE poster_key LIKE 'media/%'`);
  let firstImage = null;
  const missing = [];
  for (const row of rows) {
    try {
      await fs.access(mediaStorage.pathFor(row.mkey));
      if (!firstImage && /\.(jpg|png|webp)$/.test(row.mkey)) firstImage = row;
    } catch {
      missing.push(`${row.kind} #${row.id} -> ${row.mkey}`);
    }
  }
  if (!rows.length) warn('no uploaded media referenced yet — upload a poster in Admin → Events & tickets, then re-run');
  else if (missing.length) bad(`${missing.length} of ${rows.length} referenced files are missing on disk:\n         ${missing.slice(0, 20).join('\n         ')}`);
  else ok(`all ${rows.length} referenced files exist`);

  console.log('\n4. Serving');
  if (!firstImage) {
    warn('skipped (no stored image to probe)');
  } else {
    const p = mediaStorage.publicPath(firstImage.mkey);
    console.log(`  probing ${firstImage.kind} #${firstImage.id}: ${p}`);
    const local = await probe(`http://127.0.0.1:${env.port}${p}`);
    if (local.status === 200 && local.type.startsWith('image/')) ok(`Node serves it directly (200 ${local.type})`);
    else bad(`Node did not serve it: ${local.status ?? local.error} ${local.type}`);

    const publicUrl = `${new URL(env.frontendUrl).origin}${p}`;
    const pub = await probe(publicUrl);
    if (pub.status === 200 && pub.type.startsWith('image/')) ok(`public site serves it (200 ${pub.type}) at ${publicUrl}`);
    else {
      bad(`public site returned ${pub.status ?? pub.error} ${pub.type || ''} for ${publicUrl}`);
      if (local.status === 200) {
        console.log('        Node is fine, so Nginx/Cloudflare is not passing /api/v1/media/* to Node.');
        console.log('        Usual cause: a regex static-file block such as  location ~* \\.(jpg|png|webp)$ { ... }');
        console.log('        outranks "location /api/". Fix: change it to  location ^~ /api/ { proxy_pass ...; }');
        console.log('        then: sudo nginx -t && sudo systemctl reload nginx');
      }
    }
  }
} catch (error) {
  bad(`check aborted: ${error.message}`);
} finally {
  await pool.end().catch(() => {});
  console.log(problems ? `\n${problems} problem(s) found.\n` : '\nAll media checks passed.\n');
  process.exitCode = problems ? 1 : 0;
}
