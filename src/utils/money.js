const TZS_FORMAT = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });

/** 20000 -> 'TZS 20,000'. Display only: every amount shown comes from the API. */
export function formatTzs(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '';
  return `TZS ${TZS_FORMAT.format(Number(amount))}`;
}

/** '+255794987520' -> '0794 987 520' for display and form prefill. Other numbers are returned unchanged. */
export function formatTzPhone(phone) {
  if (!phone) return '';
  if (/^\+255\d{9}$/.test(phone)) {
    const local = `0${phone.slice(4)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return phone;
}
