export type UserRole = 'ceo' | 'opm' | 'hr' | 'staff';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
}
