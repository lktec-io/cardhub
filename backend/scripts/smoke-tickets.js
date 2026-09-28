/**
 * Post-deploy smoke test for the ticket marketplace. Runs the real public
 * flow end to end over HTTP:
 *   list events → event detail → create order → start payment →
 *   demo confirm → ticket page → QR verification
 *
 * Usage:
 *   npm run smoke:tickets                               (http://localhost:4006/api/v1)
 *   npm run smoke:tickets -- https://cardhub.co.tz/api/v1
 *
 * Requires the server to run with TICKET_PAYMENT_MODE=demo and the demo
 * event seeded (npm run seed:demo-tickets). Each run buys ONE demo
 * "Regular" ticket, flagged is_demo. No real money moves and no PIN is
 * sent: the demo PIN is a browser-only check. Uses a fixed test buyer,
 * no real customer data.
 */
import { randomUUID } from 'node:crypto';

const API = (process.argv[2] || 'http://localhost:4006/api/v1').replace(/\/+$/, '');
let step = 0;

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function pass(message) {
  step += 1;
  console.log(`  ✓ ${step}. ${message}`);
}

function fail(message, detail) {
  console.error(`  ✗ ${message}`);
  if (detail) console.error(`    ${JSON.stringify(detail).slice(0, 400)}`);
  process.exit(1);
}

console.log(`Ticket smoke test against ${API}\n`);

const list = await call('GET', '/tickets/events');
if (list.status === 404) fail('GET /tickets/events returned 404 — the new API is not deployed (or migrations/restart pending)', list.json);
if (list.status !== 200) fail(`GET /tickets/events returned ${list.status}`, list.json);
if (list.json.data.paymentMode !== 'demo') fail(`Server paymentMode is "${list.json.data.paymentMode}" — set TICKET_PAYMENT_MODE=demo and restart the API`);
const listed = list.json.data.events;
if (!listed.length) fail('No events listed — run `npm run seed:demo-tickets` on the server');
pass(`marketplace lists ${listed.length} event(s), payment mode: demo`);

const slug = listed[0].slug;
const detail = await call('GET', `/tickets/events/${slug}`);
if (detail.status !== 200) fail(`GET /tickets/events/${slug} returned ${detail.status}`, detail.json);
const type = detail.json.data.event.ticketTypes.find((t) => ['available', 'low'].includes(t.availability));
if (!type) fail('No ticket type currently on sale');
pass(`event "${detail.json.data.event.title}" — buying 1 × ${type.name} at TZS ${type.priceTzs}`);

const created = await call('POST', '/tickets/orders', {
  eventSlug: slug,
  ticketTypeId: type.id,
  quantity: 1,
  buyerName: 'CardHub Smoke Test',
  buyerPhone: '0700000000',
  idempotencyKey: randomUUID(),
});
if (created.status !== 201) fail(`POST /tickets/orders returned ${created.status}`, created.json);
const order = created.json.data.order;
if (order.totalTzs !== type.priceTzs) fail('Order total does not match the ticket price', order);
pass(`order reserved, total TZS ${order.totalTzs}, held ${order.reservationSecondsLeft}s`);

const pinProbe = await call('POST', `/tickets/orders/${order.token}/pay`, { pin: '0000' });
if (pinProbe.status !== 400) fail('The API accepted a request containing a PIN field', pinProbe.json);
pass('API refuses any request that carries a PIN');

const pay = await call('POST', `/tickets/orders/${order.token}/pay`, {});
if (pay.status !== 200 || pay.json.data.nextAction !== 'demo_confirmation') fail('Starting payment did not return demo_confirmation', pay.json);
pass('payment started (demo confirmation step)');

const confirmed = await call('POST', `/tickets/orders/${order.token}/demo-confirm`);
if (confirmed.status !== 200 || confirmed.json.data.order.status !== 'paid') fail('Demo confirmation failed', confirmed.json);
const ticket = confirmed.json.data.order.tickets[0];
if (!ticket || !/^CH-/.test(ticket.ticketId) || !ticket.isDemo) fail('No demo ticket was issued', confirmed.json.data.order);
pass(`paid (demo) — ticket ${ticket.ticketId} issued`);

const passPage = await call('GET', `/tickets/pass/${ticket.token}`);
if (passPage.status !== 200) fail('Ticket page lookup failed', passPage.json);
if (JSON.stringify(passPage.json).includes('700000000')) fail('Shared ticket page exposes the full phone number');
pass('shared ticket page loads with the phone number masked');

const verified = await call('GET', `/tickets/verify/${ticket.token}`);
if (verified.json?.data?.result !== 'VALID') fail('QR verification did not return VALID', verified.json);
if (!ticket.qrPayload.endsWith(`/ticket/verify/${ticket.token}`)) fail('QR payload is not the verification URL', ticket.qrPayload);
pass(`QR verification: VALID (${ticket.qrPayload.replace(ticket.token, '<token>')})`);

const bogus = await call('GET', `/tickets/verify/${'x'.repeat(43)}`);
if (bogus.json?.data?.result !== 'INVALID') fail('An unknown ticket token did not return INVALID', bogus.json);
pass('unknown ticket: INVALID');

console.log(`\nAll ${step} checks passed. Open ${ticket.qrPayload.replace(/\/ticket\/verify\/.*/, '/ticket')} in a phone browser for the visual check.`);
