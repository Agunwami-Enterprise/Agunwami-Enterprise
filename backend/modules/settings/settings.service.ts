/**
 * backend/modules/settings/settings.service.ts
 *
 * Server-side Settings Service.
 * Manages CEO executive profile and company-wide enterprise configurations.
 */

import { listDocs, updateDoc } from '../../core/firestore';
import type {
  ExecutiveProfile,
  EnterpriseSettings,
  UpdateProfileDto,
} from './settings.types';

export class SettingsService {
  /**
   * Retrieves the current CEO profile.
   */
  static async getExecutiveProfile(): Promise<ExecutiveProfile> {
    const users = await listDocs('users', 50).catch(() => []);
    const ceoUser = users.find(u =>
      u.email === 'that.dev.guy.aeceo@aehub.io' ||
      u.dept === 'ceo' ||
      u.role === 'ceo'
    );

    return {
      uid: ceoUser?._id || '',
      name: ceoUser?.displayName || ceoUser?.name || 'Executive CEO',
      email: ceoUser?.email || 'that.dev.guy.aeceo@aehub.io',
      role: 'CEO & Founder',
      department: 'Executive Office',
      phone: ceoUser?.phone || '',
      avatarUrl: ceoUser?.avatarUrl || '',
      lastLogin: new Date().toISOString(),
      twoFactorEnabled: true,
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
  static async updateProfile(dto: UpdateProfileDto): Promise<boolean> {
    const users = await listDocs('users', 50).catch(() => []);
    const ceoUser = users.find(u => u.email === 'that.dev.guy.aeceo@aehub.io');
    if (!ceoUser) return true;

    const updated = await updateDoc('users', ceoUser._id, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });
    return !!updated;
  }
}
