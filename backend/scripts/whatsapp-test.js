/**
 * Beem WhatsApp template check — run ON THE SERVER, from backend/:
 *
 *   npm run whatsapp:test -- --templates                 # list approved templates on your sender (read-only)
 *   npm run whatsapp:test -- --to 0712345678             # config + template verification + payload preview, sends nothing
 *   npm run whatsapp:test -- --to 0712345678 --send      # sends ONE real message, only if verification passes
 *
 * Verification asks Beem (GET message-templates/list, read-only) whether
 * BEEM_WHATSAPP_TEMPLATE_ID exists ON the sender in BEEM_WHATSAPP_FROM —
 * the exact pairing behind "Template id and channel do not match" — and
 * whether it is enabled with 6 placeholders. Prints variable names only,
 * never values. "Accepted" means Beem took the job; delivery is only
 * confirmed by the phone or a delivery report.
 */
import { env } from '../src/config/env.js';
import { whatsappProvider, maskPhoneForLog } from '../src/services/providers/whatsappProvider.js';
import { buildInvitationTemplateParams, INVITATION_TEMPLATE_VARIABLES } from '../src/utils/messageTemplates.js';
import { normalizePhoneForDelivery } from '../src/utils/phone.js';
import { getPublicOrderUrl } from '../src/utils/publicUrl.js';

const args = process.argv.slice(2);
const argValue = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const toArg = argValue('--to');
const send = args.includes('--send');
const listMode = args.includes('--templates');
const b = env.whatsapp.beem;

const VARS = [
  ['BEEM_WHATSAPP_API_URL', b.apiUrl],
  ['BEEM_WHATSAPP_API_KEY (or BEEM_API_KEY)', b.apiKey],
  ['BEEM_WHATSAPP_API_SECRET (or BEEM_SECRET_KEY)', b.apiSecret || (b.authMode === 'token' || b.authMode === 'bearer' ? 'n/a for token auth' : '')],
  ['BEEM_WHATSAPP_FROM', env.whatsapp.beemFrom],
  ['BEEM_WHATSAPP_TEMPLATE_ID', b.templateId],
  ['BEEM_WHATSAPP_CALLBACK_SECRET (delivery reports)', b.callbackSecret],
];

console.log('\nBeem WhatsApp configuration');
for (const [name, value] of VARS) console.log(`  ${value ? 'set    ' : 'MISSING'}  ${name}`);
console.log(`  provider: ${env.whatsapp.provider || '(none)'} · auth mode: ${b.authMode} · rate: ${b.ratePerSecond}/s · timeout: ${b.timeoutMs} ms`);
if (b.apiUrl) console.log(`  send endpoint: ${new URL(b.apiUrl).host}${new URL(b.apiUrl).pathname}`);
console.log(`  sender (from_addr): ${maskPhoneForLog(env.whatsapp.beemFrom)}`);
if (env.whatsapp.provider && env.whatsapp.provider !== 'beem' && b.apiUrl) {
  console.log(`  !! WHATSAPP_PROVIDER is "${env.whatsapp.provider}", which overrides the Beem template. Set WHATSAPP_PROVIDER=beem (or remove it) and restart.`);
}
if (b.templateId && !/^\d+$/.test(b.templateId)) console.log('  !! BEEM_WHATSAPP_TEMPLATE_ID must be a whole number (Beem\'s template id).');

if (!b.apiKey || !env.whatsapp.beemFrom) {
  console.log('\nSet the MISSING variables in backend/.env first.\n');
  process.exit(1);
}

function printTemplates(list) {
  if (!list.length) return console.log('  (none)');
  for (const t of list) console.log(`  id ${t.id} · "${t.name}" · ${t.status} · ${t.language || '?'} · ${t.category || '?'} · ${t.placeholders ?? '?'} placeholders${t.metaTemplateId ? ` · Meta id ${t.metaTemplateId}` : ''}`);
}

if (listMode) {
  const q = argValue('--q');
  const res = await whatsappProvider.listTemplates({ q, channelNumber: env.whatsapp.beemFrom });
  console.log(`\nApproved templates on sender ${maskPhoneForLog(env.whatsapp.beemFrom)}${q ? ` matching "${q}"` : ''} (HTTP ${res.httpStatus ?? 'no response'}):`);
  if (!res.ok) {
    console.log(`  Could not list templates: ${res.error}\n`);
    process.exit(1);
  }
  printTemplates(res.templates);
  console.log('\nUse the "id" (not the Meta id) of the enabled KADI YA MWALIKO template as BEEM_WHATSAPP_TEMPLATE_ID.\n');
  process.exit(0);
}

// ---- template verification (read-only)
console.log('\nTemplate verification (read-only)');
let verified = false;
const onChannel = await whatsappProvider.listTemplates({ id: b.templateId, channelNumber: env.whatsapp.beemFrom });
if (!onChannel.ok) {
  console.log(`  Could not reach Beem's template list: ${onChannel.error}`);
} else {
  const match = onChannel.templates.find((t) => String(t.id) === String(b.templateId));
  if (!match) {
    const anywhere = await whatsappProvider.listTemplates({ id: b.templateId });
    const elsewhere = anywhere.ok && anywhere.templates.find((t) => String(t.id) === String(b.templateId));
    console.log(
      elsewhere
        ? `  FAIL template ${b.templateId} ("${elsewhere.name}") exists but NOT on sender ${maskPhoneForLog(env.whatsapp.beemFrom)} — this is the "Template id and channel do not match" error.`
        : `  FAIL Beem has no template with id ${b.templateId}. It may be Meta's id; Beem needs its own id.`
    );
    console.log('       List the right one with: npm run whatsapp:test -- --templates');
  } else {
    const enabled = /^(enabled|approved|active)$/i.test(match.status || '');
    const sixVars = match.placeholders === INVITATION_TEMPLATE_VARIABLES.length;
    console.log(`  ${enabled ? 'ok  ' : 'FAIL'} template ${match.id} "${match.name}" status: ${match.status}`);
    console.log(`  ${sixVars ? 'ok  ' : 'FAIL'} placeholders in template: ${match.placeholders} (CardHub sends ${INVITATION_TEMPLATE_VARIABLES.length})`);
    console.log(`  ok   on sender ${maskPhoneForLog(env.whatsapp.beemFrom)} · language ${match.language || '?'}`);
    verified = enabled && sixVars;
  }
}

const to = normalizePhoneForDelivery(toArg || '');
if (!to) {
  console.log(`\n${toArg ? 'That phone number is not valid.' : 'Add --to <phone> to preview the payload.'}\n`);
  process.exit(toArg || !verified ? 1 : 0);
}

const params = buildInvitationTemplateParams({
  guestName: 'CardHub Test',
  eventName: 'CardHub WhatsApp Test',
  eventDate: new Date().toISOString().slice(0, 10),
  eventTime: '18:00',
  venue: 'CardHub',
  publicUrl: getPublicOrderUrl('whatsapp-test'),
});
console.log(`\nPayload preview (recipient ${maskPhoneForLog(to)}, template ${b.templateId}, channel whatsapp):`);
INVITATION_TEMPLATE_VARIABLES.forEach((label, i) => console.log(`  params[${i}] -> {{${i}}}/{{${i + 1}}} ${label}: ${params[i]}`));

if (!send) {
  console.log(`\nPreview only${verified ? '' : ' (verification did not pass)'}. Add --send to send one real message.\n`);
  process.exit(verified ? 0 : 1);
}
if (!verified || !whatsappProvider.usesTemplate) {
  console.log('\nNot sent: fix the FAIL lines above first (nothing was sent to Beem).\n');
  process.exit(1);
}

const result = await whatsappProvider.sendInvitationTemplate({ to, params });
console.log(`\nBeem HTTP status: ${result.httpStatus ?? 'no response'}`);
console.log(`Beem response:    ${result.providerResponse ?? '(empty)'}`);
if (result.status === 'queued') {
  console.log(`\nACCEPTED by Beem${result.providerMessageId ? ` (job ${result.providerMessageId})` : ''}. Check the phone: only a received message or a "delivered" report proves delivery.\n`);
  process.exit(0);
}
console.log(`\nNOT ACCEPTED: ${result.error}\n`);
process.exit(1);
