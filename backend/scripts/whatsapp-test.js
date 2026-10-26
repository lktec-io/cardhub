/**
 * Beem WhatsApp template check — run ON THE SERVER, from backend/:
 *
 *   npm run whatsapp:test -- --templates                 # list approved templates on your sender (read-only)
 *   npm run whatsapp:test -- --to 0712345678             # config + template check + payload validation; sends nothing
 *   npm run whatsapp:test -- --to 0712345678 --send      # sends ONE real message to that (consenting) number
 *   ... --media-url https://…/card.jpg                    # the header image, when BEEM_WHATSAPP_TEMPLATE_MEDIA=image
 *
 * The template check asks Beem (GET message-templates/list, read-only)
 * whether BEEM_WHATSAPP_TEMPLATE_ID is on the sender in BEEM_WHATSAPP_FROM —
 * the pairing behind "Template id and channel do not match". If that list
 * endpoint is unavailable to the account (e.g. HTTP 404) the check is
 * skipped, not failed: a 404 there says nothing about the template, and
 * Beem's answer to a real send is the authoritative check. --send is refused
 * only when the list PROVES the pairing is wrong or the payload is invalid.
 * Prints variable names and masked numbers only, never secrets.
 */
import { env } from '../src/config/env.js';
import { whatsappProvider, maskPhoneForLog, toBeemNumber, validateTemplateParams, buildBeemTemplateBody } from '../src/services/providers/whatsappProvider.js';
import { buildInvitationTemplateParams, INVITATION_TEMPLATE_VARIABLES } from '../src/utils/messageTemplates.js';
import { normalizePhoneForDelivery } from '../src/utils/phone.js';
import { getPublicOrderUrl } from '../src/utils/publicUrl.js';

const args = process.argv.slice(2);
const argValue = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const toArg = argValue('--to');
const send = args.includes('--send');
const listMode = args.includes('--templates');
const mediaUrl = argValue('--media-url');
const b = env.whatsapp.beem;
const rawFrom = env.whatsapp.beemFrom;
const sentFrom = toBeemNumber(rawFrom);

const VARS = [
  ['BEEM_WHATSAPP_API_URL', b.apiUrl],
  ['BEEM_WHATSAPP_API_KEY (or BEEM_API_KEY)', b.apiKey],
  ['BEEM_WHATSAPP_API_SECRET (or BEEM_SECRET_KEY)', b.apiSecret || (b.authMode === 'token' || b.authMode === 'bearer' ? 'n/a for token auth' : '')],
  ['BEEM_WHATSAPP_FROM', rawFrom],
  ['BEEM_WHATSAPP_TEMPLATE_ID', b.templateId],
  ['BEEM_WHATSAPP_CALLBACK_SECRET (delivery reports)', b.callbackSecret],
];

console.log('\nBeem WhatsApp configuration');
for (const [name, value] of VARS) console.log(`  ${value ? 'set    ' : 'MISSING'}  ${name}`);
console.log(`  provider: ${env.whatsapp.provider || '(none)'} · auth mode: ${b.authMode} · rate: ${b.ratePerSecond}/s · timeout: ${b.timeoutMs} ms`);
console.log(`  config file: ${env.configSource.envFile} (${env.configSource.envFileLoaded ? 'loaded' : 'NOT FOUND'})`);
if (env.configSource.overriddenByProcessEnv.length) {
  console.log(`  !! this shell's environment overrides backend/.env for: ${env.configSource.overriddenByProcessEnv.join(', ')}`);
}
console.log('  note: this checks THIS shell. The running API reports its own settings at startup ("WhatsApp effective configuration" in pm2 logs)');
console.log('        and at GET /api/v1/admin/diagnostics/whatsapp (admin login).');
if (b.apiUrl) console.log(`  send endpoint:  ${new URL(b.apiUrl).host}${new URL(b.apiUrl).pathname}`);
console.log(`  list endpoint:  ${new URL(b.templatesUrl).host}${new URL(b.templatesUrl).pathname}`);
console.log(`  template id that will be sent: ${b.templateId || '(none)'} (from BEEM_WHATSAPP_TEMPLATE_ID)`);
console.log(`  template header: ${b.templateMedia}${b.templateMedia === 'image' ? ' (content.mediaUrl is sent)' : ' (no content.mediaUrl)'} (from BEEM_WHATSAPP_TEMPLATE_MEDIA)`);
console.log(`  key pair in use: ${b.credentialSource || '(none)'}`);
console.log(`  sender (from_addr) sent as: ${maskPhoneForLog(sentFrom)}${/^255\d{9}$/.test(sentFrom) ? '' : '  !! not a 255XXXXXXXXX number — check BEEM_WHATSAPP_FROM'}`);
if (rawFrom && rawFrom.replace(/\D/g, '') !== sentFrom) {
  console.log('  note: BEEM_WHATSAPP_FROM is written in local/+ format; it is now sent in international digits (older builds sent it as typed).');
}
if (b.apiUrl && !/\/v1\/broadcast\/template\/api-send$/.test(new URL(b.apiUrl).pathname)) {
  console.log("  !! BEEM_WHATSAPP_API_URL path is not Beem's documented template send path (/v1/broadcast/template/api-send).");
}
if (env.whatsapp.provider && env.whatsapp.provider !== 'beem' && b.apiUrl) {
  console.log(`  !! WHATSAPP_PROVIDER is "${env.whatsapp.provider}", which overrides the Beem template. Set WHATSAPP_PROVIDER=beem (or remove it) and restart.`);
}
if (b.templateId && !/^\d+$/.test(b.templateId)) console.log("  !! BEEM_WHATSAPP_TEMPLATE_ID must be a whole number (Beem's template id).");

if (!b.apiKey || !rawFrom) {
  console.log('\nSet the MISSING variables in backend/.env first.\n');
  process.exit(1);
}

function printTemplates(list) {
  if (!list.length) return console.log('  (none)');
  for (const t of list) console.log(`  id ${t.id} · "${t.name}" · ${t.status} · ${t.language || '?'} · ${t.category || '?'} · ${t.placeholders ?? '?'} placeholders${t.metaTemplateId ? ` · Meta id ${t.metaTemplateId}` : ''}`);
}

function explainListFailure(res) {
  console.log(`  Could not list templates (${res.endpoint || 'list endpoint'} HTTP ${res.httpStatus ?? 'no response'}): ${res.error}`);
  if (res.providerResponse) console.log(`  Beem replied: ${res.providerResponse}`);
}

if (listMode) {
  const q = argValue('--q');
  const res = await whatsappProvider.listTemplates({ q, channelNumber: rawFrom });
  console.log(`\nApproved templates on sender ${maskPhoneForLog(sentFrom)}${q ? ` matching "${q}"` : ''}:`);
  if (!res.ok) {
    explainListFailure(res);
    console.log('  Listing is only a diagnostic. Confirm template/sender in Beem Engage (Templates) or with Beem support;');
    console.log('  then run --to <phone> (validation) and --to <phone> --send (Beem decides).\n');
    process.exit(1);
  }
  printTemplates(res.templates);
  const configured = res.templates.find((t) => String(t.id) === String(b.templateId));
  console.log(configured ? `\nTemplate ${b.templateId} IS on this sender.\n` : `\nTemplate ${b.templateId} is NOT in this sender's list.\n`);
  process.exit(0);
}

// ---- template check (read-only)
console.log('\nTemplate check (read-only)');
let verified = false;
let listingUnavailable = false;
const onChannel = await whatsappProvider.listTemplates({ id: b.templateId, channelNumber: rawFrom });
if (!onChannel.ok) {
  listingUnavailable = true;
  console.log(`  skip  template list unavailable (${onChannel.endpoint || 'list endpoint'} HTTP ${onChannel.httpStatus ?? 'no response'}).`);
  console.log(`        Template ${b.templateId} on sender ${maskPhoneForLog(sentFrom)} could not be pre-checked; a real send is the authoritative check.`);
} else {
  const match = onChannel.templates.find((t) => String(t.id) === String(b.templateId));
  if (!match) {
    const anywhere = await whatsappProvider.listTemplates({ id: b.templateId });
    const elsewhere = anywhere.ok && anywhere.templates.find((t) => String(t.id) === String(b.templateId));
    console.log(
      elsewhere
        ? `  FAIL template ${b.templateId} ("${elsewhere.name}") exists but NOT on sender ${maskPhoneForLog(sentFrom)} — this is the "Template id and channel do not match" error.`
        : `  FAIL Beem lists no template ${b.templateId} for this account. It may be Meta's id; Beem needs its own id.`
    );
  } else {
    const enabled = /^(enabled|approved|active)$/i.test(match.status || '');
    const sixVars = match.placeholders === INVITATION_TEMPLATE_VARIABLES.length;
    console.log(`  ${enabled ? 'ok  ' : 'FAIL'} template ${match.id} "${match.name}" status: ${match.status}`);
    console.log(`  ${sixVars ? 'ok  ' : 'FAIL'} placeholders in template: ${match.placeholders} (CardHub sends ${INVITATION_TEMPLATE_VARIABLES.length})`);
    console.log(`  ok   on sender ${maskPhoneForLog(sentFrom)} · language ${match.language || '?'}`);
    verified = enabled && sixVars;
  }
}

const to = normalizePhoneForDelivery(toArg || '');
if (!to) {
  console.log(`\n${toArg ? 'That phone number is not valid.' : 'Add --to <phone> to validate the payload.'}\n`);
  process.exit(toArg || (!listingUnavailable && !verified) ? 1 : 0);
}

const params = buildInvitationTemplateParams({
  guestName: 'CardHub Test',
  eventName: 'CardHub WhatsApp Test',
  eventDate: new Date().toISOString().slice(0, 10),
  eventTime: '18:00',
  venue: 'CardHub',
  publicUrl: getPublicOrderUrl('whatsapp-test'),
});
console.log(`\nPayload (from ${maskPhoneForLog(sentFrom)} to ${maskPhoneForLog(toBeemNumber(to))}, messageTemplateData.id ${b.templateId}, channel whatsapp):`);
INVITATION_TEMPLATE_VARIABLES.forEach((label, i) => console.log(`  params[${i}] -> {{${i}}} ${label}: ${params[i]}`));
const masked = buildBeemTemplateBody(to, params, mediaUrl);
masked.from_addr = maskPhoneForLog(masked.from_addr);
masked.destination_addr[0].phoneNumber = maskPhoneForLog(masked.destination_addr[0].phoneNumber);
console.log(`  exact request body (numbers masked, no credentials; safe to send to Beem support):
  POST ${b.apiUrl ? new URL(b.apiUrl).host + new URL(b.apiUrl).pathname : '(no URL)'}  auth: ${b.authMode}
  ${JSON.stringify(masked)}`);
const payloadProblem = validateTemplateParams(to, params, mediaUrl);
console.log(payloadProblem ? `  FAIL payload: ${payloadProblem}${b.templateMedia === 'image' ? ' (pass --media-url https://…)' : ''}` : '  ok   payload: 6 non-empty values in template order, valid recipient');

const provenBad = !listingUnavailable && !verified;
if (!send) {
  console.log(`\nNothing sent${provenBad ? ' (template check FAILED)' : listingUnavailable ? ' (template not pre-checked)' : ''}. Add --send to send one real message.\n`);
  process.exit(provenBad || payloadProblem ? 1 : 0);
}
if (provenBad || payloadProblem || !whatsappProvider.usesTemplate) {
  console.log('\nNot sent: fix the FAIL lines above first (nothing was sent to Beem).\n');
  process.exit(1);
}

const result = await whatsappProvider.sendInvitationTemplate({ to, params, mediaUrl });
console.log(`\nBeem HTTP status: ${result.httpStatus ?? 'no response'}`);
console.log(`Beem response:    ${result.providerResponse ?? '(empty)'}`);
if (result.status === 'queued') {
  console.log(`\nACCEPTED by Beem${result.providerMessageId ? ` (job ${result.providerMessageId})` : ''}. Not yet delivered: only the phone receiving it, or a "delivered" report, proves delivery.\n`);
  process.exit(0);
}
console.log(`\nNOT ACCEPTED: ${result.error}\n`);
process.exit(1);
