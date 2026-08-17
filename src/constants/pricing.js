/**
 * CardHub pricing configuration — product data, not business logic.
 * Centralized here so it can later be swapped for a backend-driven
 * `/api/v1/payments/plans` response without touching any page component.
 * No payment processing exists yet (Phase 7).
 */
export const CURRENCY = 'TZS';

export const PRICING_PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For a simple, beautiful invitation',
    price: 15000,
    billingNote: 'per event',
    isFeatured: false,
    features: [
      '1 digital invitation',
      'Access to standard templates',
      'Shareable invitation link',
      'Basic guest RSVP tracking',
    ],
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'For events that deserve more polish',
    price: 35000,
    billingNote: 'per event',
    isFeatured: true,
    features: [
      'Everything in Basic',
      'Access to premium templates',
      'Custom invitation details',
      'Guest list management',
      'RSVP reminders',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'For hosts who want it all handled',
    price: 65000,
    billingNote: 'per event',
    isFeatured: false,
    features: [
      'Everything in Classic',
      'Priority template access',
      'Advanced guest & RSVP tools',
      'Event-day check-in (coming soon)',
      'Priority support',
    ],
  },
];
