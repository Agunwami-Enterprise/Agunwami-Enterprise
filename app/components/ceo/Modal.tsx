'use client';

import AeModal from '@/app/components/common/AeModal';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** The CEO workstation modal: the shared AE modal. */
export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return <AeModal title={title ?? ''} onClose={onClose}>{children}</AeModal>;
}
