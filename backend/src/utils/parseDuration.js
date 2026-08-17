const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses simple durations like "15m", "30d", "12h" into milliseconds. */
export default function parseDuration(value) {
  const match = /^(\d+)([smhd])$/.exec(String(value).trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
