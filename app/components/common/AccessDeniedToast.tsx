'use client';

/**
 * Shows a warning toast when the page was reached by being turned away from
 * somewhere the person doesn't have access to (`?denied=…`), then takes the
 * marker out of the address so a reload doesn't show it again. Needs a
 * react-toastify ToastContainer on the page.
 */

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { DENIED_PARAM, deniedMessage } from '@/lib/workstation/access-denied';

function Notice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const denied = params.get(DENIED_PARAM);

  useEffect(() => {
    if (!denied) return;
    toast.warn(deniedMessage(denied), { toastId: `denied-${denied}`, autoClose: 7000 });
    const rest = new URLSearchParams(params.toString());
    rest.delete(DENIED_PARAM);
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [denied, params, pathname, router]);

  return null;
}

export default function AccessDeniedToast() {
  return <Suspense fallback={null}><Notice /></Suspense>;
}
