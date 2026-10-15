import { requireWsPage } from '@/lib/workstation/ws-guard';
import DocumentScreen from '@/modules/documents/components/DocumentScreen';

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const access = await requireWsPage('documents');
  const { id } = await params;
  // ?mode=view opens it in Viewing mode, even for someone who can edit.
  const startInView = (await searchParams).mode === 'view';
  return <DocumentScreen key={id} id={id} basePath="/ws/documents" isCeo={access.kind === 'ceo'}
    aeDepartmentId={access.kind === 'ceo' ? '' : access.departmentId ?? ''} startInView={startInView} />;
}
