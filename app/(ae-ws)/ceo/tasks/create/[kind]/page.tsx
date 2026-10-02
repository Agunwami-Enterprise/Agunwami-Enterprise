import { notFound } from 'next/navigation';
import TaskCreatePage from '@/modules/tasks/components/TaskCreatePage';

const CREATION_KINDS = ['task', 'sprint', 'todo'] as const;

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const creationKind = CREATION_KINDS.find(value => value === kind);
  if (!creationKind) notFound();

  return <TaskCreatePage kind={creationKind} />;
}
