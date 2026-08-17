/** Display-only mirror of backend/src/constants/plans.js — the backend is the enforcement authority. */
export function formatLimit(value) {
  return value === -1 ? 'Unlimited' : value;
}
