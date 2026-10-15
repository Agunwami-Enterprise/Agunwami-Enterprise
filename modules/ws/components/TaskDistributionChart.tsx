'use client';

/**
 * Team Task Distribution: the department team's tasks due each weekday this
 * week, grouped by stage. Palette validated for colour-vision deficiency in
 * light and dark mode (dataviz validator); exact counts are in the tooltip
 * and a screen-reader table.
 */

import { useState } from 'react';
import type { WsTask, TaskStage } from '../data';

const SERIES: Array<{ stage: TaskStage; label: string; fill: string; swatch: string }> = [
  { stage: 'todo', label: 'Assigned', fill: 'fill-[#ca8a04] dark:fill-[#b8860b]', swatch: 'bg-[#ca8a04] dark:bg-[#b8860b]' },
  { stage: 'in-progress', label: 'In Progress', fill: 'fill-[#2563eb] dark:fill-[#3b82f6]', swatch: 'bg-[#2563eb] dark:bg-[#3b82f6]' },
  { stage: 'review', label: 'Review', fill: 'fill-[#ea580c]', swatch: 'bg-[#ea580c]' },
  { stage: 'done', label: 'Done', fill: 'fill-[#0d9488]', swatch: 'bg-[#0d9488]' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function weekdaysOf(now: Date): Date[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return DAYS.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function TaskDistributionChart({ tasks, now }: { tasks: WsTask[]; now: Date }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = weekdaysOf(now);
  const counts = days.map(day => SERIES.map(series =>
    tasks.filter(task => task.due && sameDay(task.due, day) && task.stage === series.stage).length));
  const max = Math.max(1, ...counts.flat());
  const ceiling = Math.max(4, Math.ceil(max / 2) * 2);
  const ticks = [0, ceiling / 4, ceiling / 2, (ceiling * 3) / 4, ceiling];
  const total = counts.flat().reduce((sum, n) => sum + n, 0);

  // Geometry (viewBox units).
  const W = 480, H = 200, left = 28, bottom = 22, top = 8;
  const plotW = W - left, plotH = H - bottom - top;
  const groupW = plotW / DAYS.length;
  const barW = 12, gap = 2;
  const groupContent = SERIES.length * barW + (SERIES.length - 1) * gap;
  const y = (n: number) => top + plotH - (n / ceiling) * plotH;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1" aria-hidden>
        {SERIES.map(series => (
          <span key={series.stage} className="flex items-center gap-1.5 text-[12px] text-[#525252] dark:text-gray-300">
            <span className={`h-2.5 w-2.5 rounded-sm ${series.swatch}`} />{series.label}
          </span>
        ))}
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-[13px] text-[#656565] dark:text-gray-400">No team tasks are due this week.</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Team tasks due each weekday this week, by stage">
            {ticks.map(tick => (
              <g key={tick}>
                <line x1={left} x2={W} y1={y(tick)} y2={y(tick)} className="stroke-black/10 dark:stroke-white/10" strokeDasharray={tick === 0 ? undefined : '3 3'} />
                <text x={left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-[#656565] text-[10px] dark:fill-gray-400">{tick}</text>
              </g>
            ))}
            {days.map((day, d) => {
              const x0 = left + d * groupW + (groupW - groupContent) / 2;
              return (
                <g key={DAYS[d]} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
                  {/* Hit target: the whole day column. */}
                  <rect x={left + d * groupW} y={top} width={groupW} height={plotH} className={hover === d ? 'fill-black/[0.04] dark:fill-white/[0.05]' : 'fill-transparent'} />
                  {SERIES.map((series, s) => {
                    const n = counts[d][s];
                    if (n === 0) return null;
                    const h = Math.max(2, (n / ceiling) * plotH);
                    const x = x0 + s * (barW + gap);
                    const yTop = top + plotH - h;
                    const r = Math.min(4, h / 2);
                    // Rounded top, square base on the axis.
                    return (
                      <path key={series.stage} className={series.fill}
                        d={`M${x},${top + plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${top + plotH} Z`} />
                    );
                  })}
                  <text x={left + d * groupW + groupW / 2} y={H - 6} textAnchor="middle" className={`text-[11px] ${sameDay(day, now) ? 'fill-[#292929] font-semibold dark:fill-white' : 'fill-[#656565] dark:fill-gray-400'}`}>
                    {DAYS[d]}
                  </text>
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 rounded-lg bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/5 dark:bg-[#2a2a2a] dark:ring-white/10"
              style={{ left: `${((left + hover * groupW + groupW / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <p className="mb-1 font-semibold text-[#292929] dark:text-white">
                {days[hover].toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              {SERIES.map((series, s) => (
                <p key={series.stage} className="flex items-center gap-2 text-[#525252] dark:text-gray-300">
                  <span className={`h-2 w-2 rounded-sm ${series.swatch}`} />{series.label}<span className="ml-auto pl-3 font-semibold">{counts[hover][s]}</span>
                </p>
              ))}
            </div>
          )}
          <table className="sr-only">
            <caption>Team tasks due this week by stage</caption>
            <thead><tr><th>Day</th>{SERIES.map(s => <th key={s.stage}>{s.label}</th>)}</tr></thead>
            <tbody>
              {days.map((day, d) => (
                <tr key={DAYS[d]}><th>{DAYS[d]}</th>{counts[d].map((n, s) => <td key={SERIES[s].stage}>{n}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
