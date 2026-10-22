/**
 * East Africa Time (Africa/Dar_es_Salaam) is a fixed UTC+3 with no
 * daylight saving, so conversion is exact arithmetic. Organizers enter
 * wall-clock times in EAT; the database stores UTC.
 */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** '2026-10-24T18:00' (EAT) -> '2026-10-24 15:00:00' (UTC, for MySQL). Returns null if malformed. */
export function eatLocalToUtcSql(value) {
  const m = LOCAL_RE.exec(value || '');
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) - EAT_OFFSET_MS;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  // Reject impossible dates like 2026-02-31 that Date.UTC silently rolls over.
  const back = new Date(ms + EAT_OFFSET_MS);
  if (back.getUTCDate() !== Number(m[3]) || back.getUTCMonth() !== Number(m[2]) - 1) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** '2026-10-24 15:00:00' (UTC from MySQL, dateStrings) -> '2026-10-24T18:00' (EAT, for datetime-local inputs). */
export function utcSqlToEatLocal(value) {
  if (!value) return null;
  const ms = Date.parse(`${String(value).replace(' ', 'T')}Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + EAT_OFFSET_MS).toISOString().slice(0, 16);
}
