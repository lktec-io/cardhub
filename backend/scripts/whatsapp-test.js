/**
 * Beem WhatsApp template check — run ON THE SERVER, from backend/:
 *
 *   npm run whatsapp:test -- --to 0712345678            # config check + preview, sends nothing
 *   npm run whatsapp:test -- --to 0712345678 --send     # sends ONE real template message
 *
 * Only use a number that has agreed to receive the test. Prints which
 * BEEM_WHATSAPP_* variables are set (names only, never values), the six
 * template variables in their approved order, and Beem's actual HTTP
 * status and (sanitized) response. "Accepted" means Beem took the request;
 * delivery is only confirmed when the phone receives it or Beem's
 * delivery report says so.
 */
import { env } from '../src/config/env.js';
import { whatsappProvider, maskPhoneForLog } from '../src/services/providers/whatsappProvider.js';
import { buildInvitationTemplateParams } from '../src/utils/messageTemplates.js';
import { normalizePhoneForDelivery } from '../src/utils/phone.js';
import { getPublicOrderUrl } from '../src/utils/publicUrl.js';

const args = process.argv.slice(2);
const toArg = args[args.indexOf('--to') + 1];
const send = args.includes('--send');

const VARS = [
  ['BEEM_WHATSAPP_API_URL', env.whatsapp.beem.apiUrl],
  ['BEEM_WHATSAPP_API_KEY (or BEEM_API_KEY)', env.whatsapp.beem.apiKey],
  ['BEEM_WHATSAPP_API_SECRET (or BEEM_SECRET_KEY)', env.whatsapp.beem.apiSecret],
  ['BEEM_WHATSAPP_FROM', env.whatsapp.beemFrom],
  ['BEEM_WHATSAPP_TEMPLATE_ID', env.whatsapp.beem.templateId],
  ['BEEM_WHATSAPP_TEMPLATE_LANGUAGE (informational)', env.whatsapp.beem.templateLanguage],
  ['BEEM_WHATSAPP_CALLBACK_URL (delivery reports)', env.whatsapp.beem.callbackUrl],
  ['BEEM_WHATSAPP_CALLBACK_SECRET (delivery reports)', env.whatsapp.beem.callbackSecret],
];

console.log('\nBeem WhatsApp configuration');
for (const [name, value] of VARS) console.log(`  ${value ? 'set    ' : 'MISSING'}  ${name}`);
console.log(`  provider: ${env.whatsapp.provider || '(none)'} · auth mode: ${env.whatsapp.beem.authMode} · rate: ${env.whatsapp.beem.ratePerSecond}/s · timeout: ${env.whatsapp.beem.timeoutMs} ms`);
if (env.whatsapp.beem.apiUrl) console.log(`  endpoint host: ${new URL(env.whatsapp.beem.apiUrl).host}`);
console.log(`  template mode: ${whatsappProvider.usesTemplate ? `ON (template ${whatsappProvider.templateId})` : `OFF (missing: ${whatsappProvider.missingFields.join(', ') || 'n/a'})`}`);

const to = normalizePhoneForDelivery(toArg || '');
if (!to) {
  console.log('\nAdd --to <phone>, e.g. --to 0712345678 (a number that agreed to receive the test).\n');
  process.exit(toArg ? 1 : 0);
}

const params = buildInvitationTemplateParams({
  guestName: 'CardHub Test',
  eventName: 'CardHub WhatsApp Test',
  eventDate: new Date().toISOString().slice(0, 10),
  eventTime: '18:00',
  venue: 'CardHub',
  publicUrl: getPublicOrderUrl('whatsapp-test'),
});
console.log(`\nRecipient: ${maskPhoneForLog(to)}`);
['guest name', 'event name', 'event date', 'event time', 'venue', 'invitation URL'].forEach((label, i) => console.log(`  {{${i + 1}}} ${label}: ${params[i]}`));

if (!send) {
  console.log('\nPreview only. Re-run with --send to send one real template message.\n');
  process.exit(0);
}
if (!whatsappProvider.usesTemplate) {
  console.log('\nNot sent: template mode is OFF. Set the MISSING variables above in backend/.env and restart.\n');
  process.exit(1);
}

const result = await whatsappProvider.sendInvitationTemplate({ to, params });
console.log(`\nBeem HTTP status: ${result.httpStatus ?? 'no response'}`);
console.log(`Beem response:    ${result.providerResponse ?? '(empty)'}`);
if (result.status === 'queued') {
  console.log(`\nACCEPTED by Beem${result.providerMessageId ? ` (id ${result.providerMessageId})` : ''}. Check the phone: only a received message proves delivery.\n`);
  process.exit(0);
}
console.log(`\nNOT ACCEPTED: ${result.error}\n`);
process.exit(1);
