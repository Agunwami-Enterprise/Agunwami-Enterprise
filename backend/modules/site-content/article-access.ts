/**
 * backend/modules/site-content/article-access.ts
 *
 * What a person may do with an article (see ArticleRole), and the edit lock
 * that keeps two people from editing the same article at once.
 */

import type { ArticleLock, ArticleRole, SiteArticle } from './site-content.types';

/** owner > manager > editor > viewer > none; "unowned": an article from before sharing (anyone may edit it or claim it). */
export type ArticleAccess = 'owner' | ArticleRole | 'unowned' | 'none';

export interface ArticleActor { uid: string; name: string; email: string; isCeo: boolean }

export interface ArticlePermissions {
  access: ArticleAccess;
  canView: boolean;
  canEdit: boolean;
  /** Publish or unpublish (change whether it's live). */
  canPublish: boolean;
  /** Add, remove and change people's access. */
  canShare: boolean;
  /** Hand the article to someone else. */
  canTransfer: boolean;
  /** Become the owner of an article from before sharing. */
  canClaim: boolean;
  canDelete: boolean;
}

/** How long an edit lock lasts without the editor's page renewing it. */
export const LOCK_MS = 2 * 60 * 1000;

export function accessOf(article: Pick<SiteArticle, 'owner' | 'collaborators'>, uid: string): ArticleAccess {
  if (!article.owner?.uid) return 'unowned';
  if (article.owner.uid === uid) return 'owner';
  return article.collaborators?.find(c => c.uid === uid)?.role ?? 'none';
}

export function permissionsOf(article: Pick<SiteArticle, 'owner' | 'collaborators'>, actor: Pick<ArticleActor, 'uid' | 'isCeo'>): ArticlePermissions {
  // The CEO reads every article: a viewer of those not shared with them.
  const found = accessOf(article, actor.uid);
  const access: ArticleAccess = found === 'none' && actor.isCeo ? 'viewer' : found;
  const rank = { none: 0, viewer: 1, editor: 2, unowned: 3, manager: 3, owner: 4 }[access];
  return {
    access,
    canView: rank >= 1,
    canEdit: rank >= 2,
    canPublish: rank >= 3,
    canShare: access === 'manager' || access === 'owner',
    canTransfer: access === 'owner',
    canClaim: access === 'unowned',
    canDelete: access === 'owner' || actor.isCeo,
  };
}

/** The lock, if someone other than `uid` holds one that hasn't lapsed. */
export function heldByOther(lock: ArticleLock | null | undefined, uid: string, now = Date.now()): ArticleLock | null {
  if (!lock || lock.uid === uid) return null;
  return now - Date.parse(lock.at) < LOCK_MS ? lock : null;
}
