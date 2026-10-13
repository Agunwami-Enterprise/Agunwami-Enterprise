/**
 * backend/modules/status/status.service.ts
 *
 * Technical Status for the department workstation: checks the Agunwami
 * Enterprise website and each project's site from the server (HTTP status,
 * response time, SSL certificate expiry) and keeps a short history per site
 * in the enterprise project (aeStatusChecks), so uptime and incidents can be
 * shown. Checks are cached for a minute; the history keeps one result every
 * five minutes, the last 288 (a day).
 */

import 'server-only';
import { connect } from 'node:tls';
import { listDocs, updateDoc } from '../../core/firestore';
import { ProjectsService } from '../projects/projects.service';

const HISTORY = 'aeStatusChecks';
const CACHE_MS = 60_000;
const RECORD_EVERY_MS = 5 * 60_000;
const HISTORY_SIZE = 288;
const TIMEOUT_MS = 8_000;
const WEBSITE = { id: 'website', name: 'Agunwami Enterprise website', url: process.env.PUBLIC_SITE_URL || 'https://agunwamienterprise.com' };

export interface StatusCheck { at: string; ok: boolean; ms: number | null; code: number | null }

export interface SiteStatus {
  id: string;
  name: string;
  url: string;
  ok: boolean;
  /** HTTP status, or null when the site couldn't be reached. */
  code: number | null;
  ms: number | null;
  error: string | null;
  checkedAt: string;
  /** When the SSL certificate expires (null if it couldn't be read). */
  sslValidTo: string | null;
  /** Share of recorded checks in the last 24 hours that succeeded (null without history). */
  uptime24h: number | null;
  /** The last 48 recorded checks (four hours), for the bars. */
  history: StatusCheck[];
  /** Failed checks in the last 24 hours, newest first. */
  incidents: StatusCheck[];
}

async function checkHttp(url: string): Promise<{ ok: boolean; code: number | null; ms: number | null; error: string | null }> {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    await res.body?.cancel().catch(() => undefined);
    return { ok: res.status < 400, code: res.status, ms: Date.now() - started, error: res.status < 400 ? null : `HTTP ${res.status}` };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return { ok: false, code: null, ms: null, error: timedOut ? `No response in ${TIMEOUT_MS / 1000}s` : 'Could not connect' };
  }
}

function sslExpiry(url: string): Promise<string | null> {
  return new Promise(resolve => {
    let host: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return resolve(null);
      host = parsed.hostname;
    } catch {
      return resolve(null);
    }
    const socket = connect({ host, port: 443, servername: host, timeout: TIMEOUT_MS }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
      resolve(validTo && !Number.isNaN(validTo.getTime()) ? validTo.toISOString() : null);
    });
    socket.on('error', () => resolve(null));
    socket.on('timeout', () => { socket.destroy(); resolve(null); });
  });
}

function toHistory(value: unknown): StatusCheck[] {
  return Array.isArray(value)
    ? value.flatMap(item => {
      const r = item as Record<string, unknown>;
      return typeof r?.at === 'string' ? [{ at: r.at, ok: r.ok === true, ms: typeof r.ms === 'number' ? r.ms : null, code: typeof r.code === 'number' ? r.code : null }] : [];
    })
    : [];
}

const safeKey = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100) || 'site';

let cache: { at: number; sites: SiteStatus[] } | null = null;

export class StatusService {
  static async getStatus(force = false): Promise<SiteStatus[]> {
    if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.sites;

    const projects = await ProjectsService.getProjectSites().catch(() => []);
    const targets = [WEBSITE, ...projects.filter(p => p.url !== WEBSITE.url)];
    const historyDocs = await listDocs(HISTORY, 100).catch(() => []);
    const histories = new Map(historyDocs.map(doc => [String(doc._id), toHistory(doc.checks)]));
    const now = new Date();

    const sites = await Promise.all(targets.map(async target => {
      const [http, sslValidTo] = await Promise.all([checkHttp(target.url), sslExpiry(target.url)]);
      const key = safeKey(target.id);
      let history = histories.get(key) ?? [];
      const last = history[history.length - 1];
      if (!last || now.getTime() - new Date(last.at).getTime() >= RECORD_EVERY_MS) {
        history = [...history, { at: now.toISOString(), ok: http.ok, ms: http.ms, code: http.code }].slice(-HISTORY_SIZE);
        await updateDoc(HISTORY, key, { name: target.name, url: target.url, checks: history }).catch(() => null);
      }
      const dayAgo = now.getTime() - 86_400_000;
      const recent = history.filter(check => new Date(check.at).getTime() >= dayAgo);
      return {
        id: target.id,
        name: target.name,
        url: target.url,
        ...http,
        checkedAt: now.toISOString(),
        sslValidTo,
        uptime24h: recent.length ? Math.round((recent.filter(c => c.ok).length / recent.length) * 1000) / 10 : null,
        history: history.slice(-48),
        incidents: recent.filter(check => !check.ok).reverse().slice(0, 20),
      } satisfies SiteStatus;
    }));

    cache = { at: Date.now(), sites };
    return sites;
  }
}
