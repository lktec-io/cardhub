/**
 * The fixed code the DEMO PAYMENT MODE screen asks for. Published on
 * that screen on purpose: nobody is ever asked to type their own
 * mobile-money PIN. Checked in the browser only and never sent to the API.
 */
export const DEMO_PIN = '1234';

/** Price filter presets for the marketplace (TZS, upper bound on an event's cheapest ticket). */
export const TICKET_PRICE_FILTERS = [10000, 20000, 50000, 100000];

export const TICKET_DATE_FILTERS = ['today', 'weekend', 'week', 'month'];
