import DocumentEditorPage from '@/modules/documents/components/DocumentEditorPage';

// The CEO layout already limits /ceo to the CEO.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentEditorPage key={id} id={id} basePath="/ceo/documents" isCeo />;
}
