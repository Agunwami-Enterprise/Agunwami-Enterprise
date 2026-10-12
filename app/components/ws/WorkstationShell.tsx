'use client';

import CeoShell from '@/app/components/ceo/CeoShell';
import { AccessProvider, type ClientAccess } from '@/lib/workstation/access-context';
import WorkstationSidebar from './WorkstationSidebar';

/** The workstation frame for AE departments, with their pages in the sidebar. */
export default function WorkstationShell({ access, children }: { access: ClientAccess; children: React.ReactNode }) {
  return (
    <AccessProvider value={access}>
      <CeoShell
        Sidebar={WorkstationSidebar}
        navbar={{ basePath: '/ws', roleLabel: access.departmentName, showProjectNotifications: false, hideMenuOnDesktop: true }}
      >
        {children}
      </CeoShell>
    </AccessProvider>
  );
}
