'use client';

/**
 * The signed-in person's AE department access, resolved on the server by the
 * /ws layout and shared with the sidebar and pages.
 */

import { createContext, useContext } from 'react';

export interface ClientAccess {
  kind: 'ceo' | 'department';
  /** The AE department ('' for the CEO). */
  departmentId: string;
  departmentName: string;
  title: string;
  pages: string[];
  isDepartmentAdmin: boolean;
}

const AccessContext = createContext<ClientAccess | null>(null);

export const AccessProvider = AccessContext.Provider;

export function useWorkstationAccess(): ClientAccess {
  const access = useContext(AccessContext);
  if (!access) throw new Error('useWorkstationAccess must be used inside the /ws workstation.');
  return access;
}
