'use client';

import MessagingClient from './MessagingClient';

/**
 * Same messaging UI as AE Hub's staff messages page. `ae-messages` recreates
 * the AE Hub staff layout around it (page padding, Geist, 7px corners, thin
 * scrollbars), and the 56px workstation navbar plus this padding is what the
 * page's height accounts for (88px on mobile, 104px from md up).
 */
export default function MessagesPage() {
  return (
    <div className="ae-messages p-4 md:p-6" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      <MessagingClient />
    </div>
  );
}
