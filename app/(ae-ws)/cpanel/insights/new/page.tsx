import ArticleEditor from '@/app/components/cpanel/ArticleEditor';
import { verifySession } from '@/lib/workstation/session';
import { articleActor } from '@/lib/workstation/article-actor';

export default async function NewArticlePage() {
  const actor = await articleActor(await verifySession());
  return <ArticleEditor me={{ uid: actor.uid, name: actor.name, email: actor.email }} />;
}
