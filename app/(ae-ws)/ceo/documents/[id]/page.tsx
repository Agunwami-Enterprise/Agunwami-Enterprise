import DocumentScreen from '@/modules/documents/components/DocumentScreen';

// The CEO layout already limits /ceo to the CEO.
export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  // ?mode=view opens it in Viewing mode, even for someone who can edit.
  const startInView = (await searchParams).mode === 'view';
  return <DocumentScreen key={id} id={id} basePath="/ceo/documents" isCeo startInView={startInView} />;
}
