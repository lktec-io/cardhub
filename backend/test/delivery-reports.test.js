// Beem template delivery reports -> order WhatsApp status (pure mapping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBeemDeliveryReports } from '../src/utils/beemDeliveryReports.js';

const report = (status, extra = {}) => ({ broadcast_id: 'job-123', message_id: 'msg-1', status, destination: '255674022265', message: 'detail', ...extra });

test('delivered/read confirm delivery ("sent"); failed carries the reason; accepted changes nothing', () => {
  const [delivered, read, failed, accepted] = parseBeemDeliveryReports([report('delivered'), report('read'), report('failed', { message: 'Number not on WhatsApp' }), report('accepted')]);
  assert.equal(delivered.channelStatus, 'sent');
  assert.equal(read.channelStatus, 'sent');
  assert.equal(failed.channelStatus, 'failed');
  assert.equal(failed.error, 'Number not on WhatsApp');
  assert.equal(accepted.channelStatus, null, 'acceptance is not delivery');
});

test('correlates on broadcast_id (the jobId stored at send time), then message_id', () => {
  const [r] = parseBeemDeliveryReports(report('delivered'));
  assert.deepEqual(r.ids, ['job-123', 'msg-1']);
});

test('duplicate callbacks map to the same change (idempotent)', () => {
  const twice = parseBeemDeliveryReports([report('delivered'), report('delivered')]);
  assert.deepEqual(twice[0], twice[1]);
});

test('array, { data: [...] } and single-object bodies; junk is ignored', () => {
  assert.equal(parseBeemDeliveryReports({ data: [report('read')] }).length, 1);
  assert.equal(parseBeemDeliveryReports(report('read')).length, 1);
  assert.deepEqual(parseBeemDeliveryReports(null), []);
  const [noId] = parseBeemDeliveryReports({ status: 'delivered' });
  assert.deepEqual(noId.ids, []);
});
