/**
 * backend/modules/settings/settings.service.ts
 *
 * Server-side Settings Service.
 * Manages CEO executive profile and company-wide enterprise configurations.
 */

import { getDoc, updateDoc } from '../../core/firestore';
import type {
  ExecutiveProfile,
  EnterpriseSettings,
  UpdateProfileDto,
} from './settings.types';

export class SettingsService {
  /**
   * Retrieves the current CEO profile.
   */
  static async getExecutiveProfile(uid: string, email: string): Promise<ExecutiveProfile> {
    const ceoUser = await getDoc('users', uid);

    return {
      uid,
      name: ceoUser?.displayName || ceoUser?.name || email,
      email: ceoUser?.email || email,
      role: ceoUser?.departmentPosition || 'CEO',
      department: ceoUser?.department || ceoUser?.dept || 'Executive Office',
      phone: ceoUser?.phone || '',
      avatarUrl: ceoUser?.avatarUrl || '',
      lastLogin: new Date().toISOString(),
      twoFactorEnabled: Boolean(ceoUser?.twoFactorEnabled),
    };
  }

  /**
   * Retrieves enterprise global configuration.
   */
  static async getEnterpriseSettings(): Promise<EnterpriseSettings> {
    return {
      companyName: 'Agunwami Enterprise',
      supportEmail: 'contact@agunwamienterprise.com',
      timezone: 'Africa/Lagos (GMT+1)',
      currency: 'NGN (₦)',
      workShift: {
        start: '09:00',
        end: '17:00',
        graceMinutes: 15,
      },
      security: {
        sessionTimeoutMinutes: 60,
        enforceMfaForStaff: true,
      },
      activeVentures: [
        { id: 'ae-hub', name: 'AE Hub', status: 'active' },
        { id: 'mcs', name: 'MCS', status: 'in_development' },
        { id: 'awa', name: 'AWA', status: 'in_development' },
        { id: 'trendora', name: 'Trendora', status: 'planned' },
      ],
    };
  }

  /**
   * Updates CEO profile.
   */
  static async updateProfile(uid: string, dto: UpdateProfileDto): Promise<boolean> {
    const updated = await updateDoc('users', uid, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });
    return !!updated;
  }
}
