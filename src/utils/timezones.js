let cachedOptions = null;

export function getTimezoneOptions() {
  if (cachedOptions) return cachedOptions;

  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  cachedOptions = zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
  return cachedOptions;
}

export function getDetectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Dar_es_Salaam';
  } catch {
    return 'Africa/Dar_es_Salaam';
  }
}
