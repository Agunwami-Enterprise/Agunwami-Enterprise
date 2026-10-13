'use client';

/**
 * Department workstation → Training (/ws/training): your AE Hub courses and
 * progress, and the published course catalogue. Courses are taken in AE Hub
 * (same account); "Continue" and "View course" open them there.
 */

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Award, BookOpen, ExternalLink, GraduationCap, Search, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { authDb } from '@/lib/workstation/firebase';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, Tabs, field } from './ui';

const AEHUB_URL = (process.env.NEXT_PUBLIC_AEHUB_URL || 'https://aehub-eafa6.web.app').replace(/\/$/, '');

interface Course { id: string; name: string; intro: string; category: string; level: string; hours: number; topics: number; thumbnailUrl: string; price: number }
interface Enrollment { courseId: string; progress: number; status: string; enrolledAt: number | null; lastAccessedAt: number | null }

const toCourse = (id: string, d: Record<string, unknown>): Course => ({
  id, name: String(d.name ?? d.title ?? 'Untitled course'), intro: String(d.intro ?? ''), category: String(d.category ?? 'General'),
  level: String(d.level ?? ''), hours: Number(d.hours ?? 0) || 0, topics: Number(d.topicCount ?? 0) || 0,
  thumbnailUrl: String(d.thumbnailUrl ?? ''), price: Number(d.price ?? 0) || 0,
});
const toEnrollment = (id: string, d: Record<string, unknown>): Enrollment => ({
  courseId: String(d.courseId ?? id), progress: Math.max(0, Math.min(100, Number(d.progress ?? 0) || 0)),
  status: String(d.status ?? 'started'), enrolledAt: typeof d.enrolledAt === 'number' ? d.enrolledAt : null,
  lastAccessedAt: typeof d.lastAccessedAt === 'number' ? d.lastAccessedAt : null,
});

type Tab = 'mine' | 'browse';

export default function Training() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('mine');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => onSnapshot(query(collection(authDb, 'courses'), where('status', '==', 'published')),
    snap => setCourses(snap.docs.filter(d => d.data().archived !== true).map(d => toCourse(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))),
    () => { setCourses([]); setError('Courses could not be loaded.'); }), []);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(authDb, 'users', uid, 'enrollments'),
      snap => setEnrollments(snap.docs.map(d => toEnrollment(d.id, d.data()))),
      () => { setEnrollments([]); setError('Your courses could not be loaded.'); });
  }, [uid]);

  const byId = new Map((courses ?? []).map(c => [c.id, c]));
  const mine = (enrollments ?? []).map(e => ({ enrollment: e, course: byId.get(e.courseId) }))
    .filter((x): x is { enrollment: Enrollment; course: Course } => !!x.course)
    .sort((a, b) => (b.enrollment.lastAccessedAt ?? b.enrollment.enrolledAt ?? 0) - (a.enrollment.lastAccessedAt ?? a.enrollment.enrolledAt ?? 0));
  const completed = mine.filter(x => x.enrollment.status === 'completed' || x.enrollment.progress >= 100);
  const inProgress = mine.filter(x => !completed.includes(x));
  const avg = mine.length ? Math.round(mine.reduce((n, x) => n + x.enrollment.progress, 0) / mine.length) : null;
  const enrolledIds = new Set(mine.map(x => x.course.id));
  const categories = [...new Set((courses ?? []).map(c => c.category))].sort();
  const term = search.trim().toLowerCase();
  const catalogue = (courses ?? []).filter(c => (!category || c.category === category) && (!term || c.name.toLowerCase().includes(term) || c.intro.toLowerCase().includes(term)));
  const loading = courses === null || enrollments === null;

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Training" subtitle="Your courses and progress, taken in AE Hub with the same account" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Enrolled" icon={BookOpen} iconClass="text-[#2563eb]" value={loading ? '…' : String(mine.length)} sub="Courses you’ve started" />
        <StatTile label="In Progress" icon={TrendingUp} iconClass="text-[#f59e0b]" value={loading ? '…' : String(inProgress.length)} sub="Not finished yet" />
        <StatTile label="Completed" icon={Award} iconClass="text-[#16a34a]" value={loading ? '…' : String(completed.length)} sub="Finished courses" />
        <StatTile label="Average Progress" icon={GraduationCap} iconClass="text-[#7c3aed]" value={avg === null ? '—' : `${avg}%`} sub="Across your courses" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'mine', label: 'My Courses', badge: inProgress.length }, { id: 'browse', label: 'Browse Courses' }]} />

      {tab === 'mine' ? (
        <Card title="My Courses" icon={BookOpen}>
          {loading ? <Empty>Loading…</Empty> : mine.length === 0 ? <Empty>You haven’t started a course yet. Browse the catalogue to find one.</Empty> : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {mine.map(({ course, enrollment }) => {
                const done = enrollment.status === 'completed' || enrollment.progress >= 100;
                return (
                  <li key={course.id} className="rounded-lg border border-[#e5e5e5] bg-white p-4 dark:border-white/10 dark:bg-[#232323]">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-[15px] font-semibold text-[#292929] dark:text-white">{course.name}</p>
                      <Pill label={done ? 'Completed' : 'In progress'} tone={done ? 'green' : 'amber'} />
                    </div>
                    <p className="text-[12px] text-[#656565] dark:text-gray-400">{[course.category, course.level, course.hours ? `${course.hours} h` : ''].filter(Boolean).join(' · ')}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-white/10">
                      <div className={`h-full rounded-full ${done ? 'bg-[#16a34a]' : 'bg-[#f5bd02]'}`} style={{ width: `${enrollment.progress}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[12px] text-[#656565] dark:text-gray-400">
                      <span>{enrollment.progress}% complete</span>
                      <a href={`${AEHUB_URL}/courses/${course.id}${done ? '' : '/learn'}`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#b38a00] hover:underline dark:text-[#f5bd02]">
                        {done ? 'View course' : 'Continue'} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <Card title="Course Catalogue" icon={GraduationCap} action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="relative block sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden />
              <input className={`${field} pl-9`} placeholder="Search courses" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search courses" />
            </label>
            <select className={`${field} sm:w-48`} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        }>
          {courses === null ? <Empty>Loading…</Empty> : catalogue.length === 0 ? <Empty>No courses match.</Empty> : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {catalogue.map(course => (
                <li key={course.id} className="flex flex-col rounded-lg border border-[#e5e5e5] bg-white p-4 dark:border-white/10 dark:bg-[#232323]">
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    <Pill label={course.category} tone="blue" />
                    {enrolledIds.has(course.id) && <Pill label="Enrolled" tone="green" />}
                  </div>
                  <p className="text-[15px] font-semibold text-[#292929] dark:text-white">{course.name}</p>
                  {course.intro && <p className="mt-1 line-clamp-3 text-[13px] text-[#656565] dark:text-gray-400">{course.intro}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3 text-[12px] text-[#656565] dark:text-gray-400">
                    <span>{[course.level, course.hours ? `${course.hours} h` : '', course.topics ? `${course.topics} topics` : ''].filter(Boolean).join(' · ')}</span>
                    <a href={`${AEHUB_URL}/courses/${course.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#b38a00] hover:underline dark:text-[#f5bd02]">
                      View <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
