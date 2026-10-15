import FilePreviewPage from '@/modules/documents/components/FilePreviewPage';

// A file that isn't in Documents (e.g. a chat attachment), shown read-only. The CEO layout limits /ceo to the CEO.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { url, name } = await searchParams;
  return <FilePreviewPage url={typeof url === 'string' ? url : ''} name={typeof name === 'string' ? name : 'File'} basePath="/ceo/documents" isCeo />;
}
