import { requireWsPage } from '@/lib/workstation/ws-guard';
import DocumentEditorPage from '@/modules/documents/components/DocumentEditorPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireWsPage('documents');
  const { id } = await params;
  return <DocumentEditorPage key={id} id={id} basePath="/ws/documents" isCeo={access.kind === 'ceo'} />;
}
