/**
 * backend/modules/settings/settings.types.ts
 *
 * Types for CEO Settings & Enterprise Configurations.
 */

export interface ExecutiveProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  avatarUrl?: string;
  lastLogin?: string;
  twoFactorEnabled: boolean;
}

export interface EnterpriseSettings {
  companyName: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  workShift: {
    start: string;
    end: string;
    graceMinutes: number;
  };
  security: {
    sessionTimeoutMinutes: number;
    enforceMfaForStaff: boolean;
  };
  activeVentures: Array<{
    id: string;
    name: string;
    status: 'active' | 'in_development' | 'planned';
  }>;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}
