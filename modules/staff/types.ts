// Types shared by the Staff Management page and its API routes.

import type { ProjectStaffMember } from '@/backend/modules/projects/projects.types';

export interface ExternalStaffMember extends ProjectStaffMember {
  /** The AE department this person was added to directly, if any. */
  aeDepartment: string | null;
}

export interface ExternalStaffProject {
  projectId: string;
  projectName: string;
  color: string;
  /** False when the project's metrics can't be read (no endpoint, token or a failing endpoint). */
  connected: boolean;
  /** Project departments linked to an AE department (their staff are managed from AE). */
  linkedCount: number;
  departments: Array<{ id: string; name: string; staff: ExternalStaffMember[] }>;
}
