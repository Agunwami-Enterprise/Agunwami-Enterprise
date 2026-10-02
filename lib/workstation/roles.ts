export function normalizeWorkstationRole(role: unknown, department: unknown): string {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : 'staff';
  const normalizedDepartment = typeof department === 'string'
    ? department.trim().toLowerCase()
    : '';

  return normalizedRole === 'ceo' || normalizedDepartment === 'ceo'
    ? 'ceo'
    : normalizedRole || 'staff';
}
