'use client';

import CeoShell from '@/app/components/ceo/CeoShell';
import TechSidebar from './TechSidebar';

/** The workstation frame with the Technical team's sidebar and routes. */
export default function TechShell({ children }: { children: React.ReactNode }) {
  return (
    <CeoShell
      Sidebar={TechSidebar}
      navbar={{ basePath: '/tech', roleLabel: 'Technical Dept.', showProjectNotifications: false, hideMenuOnDesktop: true }}
    >
      {children}
    </CeoShell>
  );
}
