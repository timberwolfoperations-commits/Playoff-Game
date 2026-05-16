export function normalizeBettorName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function hasAdminAccess(request: Request) {
  const expectedKey = process.env.SIDE_BET_ADMIN_KEY;
  if (!expectedKey) {
    return false;
  }

  const providedKey = request.headers.get('x-admin-key')?.trim();
  return Boolean(providedKey && providedKey === expectedKey);
}
