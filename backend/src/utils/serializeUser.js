export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    preferredLanguage: user.preferred_language,
    createdAt: user.created_at,
    // Only present on admin listUsers/getUser rows (a LEFT JOIN COUNT) —
    // undefined (and omitted from the JSON response) everywhere else.
    orderCount: user.order_count !== undefined ? Number(user.order_count) : undefined,
  };
}
