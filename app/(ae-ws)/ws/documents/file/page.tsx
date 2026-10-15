import { requireWsPage } from '@/lib/workstation/ws-guard';
import FilePreviewPage from '@/modules/documents/components/FilePreviewPage';

// A file that isn't in Documents (e.g. a chat attachment), shown read-only. Everyone has Messages.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const access = await requireWsPage('messages');
  const { url, name } = await searchParams;
  return <FilePreviewPage url={typeof url === 'string' ? url : ''} name={typeof name === 'string' ? name : 'File'} basePath="/ws/documents"
    isCeo={access.kind === 'ceo'} aeDepartmentId={access.kind === 'ceo' ? '' : access.departmentId ?? ''} />;
}
