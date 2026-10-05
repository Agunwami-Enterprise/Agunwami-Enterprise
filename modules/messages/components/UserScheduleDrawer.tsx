"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X, Calendar, Clock, Check, AlertCircle, AlertTriangle,
  ChevronLeft, ChevronRight, UserPlus, UserCheck, Shield,
  Briefcase, Video, Sparkles, Coffee, CalendarCheck
} from "lucide-react";
import {
  checkStaffArrangement,
  ApprovedLeaveRecord,
  getLocalDateString,
} from "@/utils/staffArrangementUtils";

export interface StaffMember {
  id: string;
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  department?: string | null;
  departmentPosition?: string | null;
  role?: string | null;
  status?: string | null;
  accountStatus?: string | null;
  shiftStatus?: string | null;
  isOnLeave?: boolean;
  isSuspended?: boolean;
  isFired?: boolean;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  [key: string]: any;
}

export interface Activity {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay?: boolean;
  category: any;
  createdBy?: string;
  createdByName?: string;
  invitedUsers?: string[];
  invitedUserNames?: string[];
  invitedConvoIds?: string[];
  rsvps?: Record<string, any>;
  reminderTime?: string;
  [key: string]: any;
}

/**
 * Parses YYYY-MM-DD into a local Date object anchored at noon (12:00)
 * to avoid any timezone shift or DST anomalies.
 */
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = String(dateStr).trim().split("T")[0].split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Returns YYYY-MM-DD from a Date object using local calendar parts.
 */
function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function friendlyDateStr(dateStr: string): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

function colorFromStr(str: string): string {
  const colors = [
    "bg-amber-500", "bg-purple-500", "bg-teal-500", "bg-indigo-500",
    "bg-rose-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export interface UserScheduleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  targetDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  plannedAllDay?: boolean;
  activities: Activity[];
  approvedLeaves?: ApprovedLeaveRecord[];
  onToggleInvite?: (staffId: string) => void;
  isInvited?: boolean;
  mode?: "docked" | "overlay";
}

export default function UserScheduleDrawer({
  isOpen,
  onClose,
  staff,
  targetDate,
  plannedStartTime,
  plannedEndTime,
  plannedAllDay,
  activities = [],
  approvedLeaves = [],
  onToggleInvite,
  isInvited = false,
  mode = "overlay",
}: UserScheduleDrawerProps) {
  const todayStr = getLocalDateString(new Date());
  const cleanTargetDate = targetDate ? String(targetDate).trim().split("T")[0] : todayStr;
  const [currentDate, setCurrentDate] = useState<string>(cleanTargetDate);

  // Sync date when staff or targetDate changes, without overwriting user manual browsing
  const prevStaffIdRef = useRef<string | null>(null);
  const prevTargetDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && staff) {
      const staffChanged = staff.id !== prevStaffIdRef.current;
      const targetChanged = cleanTargetDate !== prevTargetDateRef.current;
      if (staffChanged || targetChanged) {
        prevStaffIdRef.current = staff.id;
        prevTargetDateRef.current = cleanTargetDate;
        setCurrentDate(cleanTargetDate);
      }
    }
  }, [isOpen, staff?.id, cleanTargetDate]);

  if (!isOpen || !staff) return null;

  const staffName = staff.displayName || staff.email || "Staff Member";
  const initials = getInitials(staffName);
  const color = colorFromStr(staffName);

  // Evaluate arrangement for selected currentDate
  const arrangement = checkStaffArrangement({
    staffId: staff.id,
    staffMember: staff,
    targetDate: currentDate,
    startTime: plannedAllDay ? undefined : plannedStartTime,
    endTime: plannedAllDay ? undefined : plannedEndTime,
    allDay: plannedAllDay,
    activities: activities as any,
    approvedLeaves,
    type: "meet",
  });

  // Filter activities on this date involving this staff member
  const dayActivities = activities.filter(act => {
    if (!act) return false;
    const actDate = act.date ? String(act.date).trim().split("T")[0] : "";
    if (actDate !== currentDate) return false;
    const isInvitedUser = Array.isArray(act.invitedUsers) && act.invitedUsers.includes(staff.id);
    const isHost = act.createdBy === staff.id;
    return isInvitedUser || isHost;
  }).sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));

  // Check upcoming activities after currentDate
  const upcomingActivities = activities.filter(act => {
    if (!act) return false;
    const actDate = act.date ? String(act.date).trim().split("T")[0] : "";
    if (!actDate || actDate <= currentDate) return false;
    const isInvitedUser = Array.isArray(act.invitedUsers) && act.invitedUsers.includes(staff.id);
    const isHost = act.createdBy === staff.id;
    return isInvitedUser || isHost;
  }).sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(0, 4);

  // Navigate date safely by days using noon Date objects
  const changeDateByDays = (days: number) => {
    const d = parseLocalDate(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(dateToStr(d));
  };

  const isCurrentTarget = currentDate === cleanTargetDate;
  const isCurrentToday = currentDate === todayStr;

  // Generate 7 days centered around currentDate (-3 to +3)
  const weekStrip = useMemo(() => {
    const centerDate = parseLocalDate(currentDate);
    return [-3, -2, -1, 0, 1, 2, 3].map(offset => {
      const d = new Date(centerDate);
      d.setDate(d.getDate() + offset);
      const str = dateToStr(d);

      const dayArrangement = checkStaffArrangement({
        staffId: staff.id,
        staffMember: staff,
        targetDate: str,
        activities: activities as any,
        approvedLeaves,
        type: "meet",
      });

      const dayActs = activities.filter(a => {
        if (!a) return false;
        const aDate = a.date ? String(a.date).trim().split("T")[0] : "";
        if (aDate !== str) return false;
        const isInvited = Array.isArray(a.invitedUsers) && a.invitedUsers.includes(staff.id);
        const isHost = a.createdBy === staff.id;
        return isInvited || isHost;
      });

      return {
        dateStr: str,
        dayOfWeek: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: str === todayStr,
        isTarget: str === cleanTargetDate,
        isSelected: str === currentDate,
        isBlocked: dayArrangement.isBlocked,
        hasActivities: dayActs.length > 0,
      };
    });
  }, [currentDate, staff, activities, approvedLeaves, todayStr, cleanTargetDate]);

  const panelContent = (
    <div
      className={`flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-2xl z-20 overflow-hidden ${
        mode === "docked"
          ? "w-full max-w-sm sm:max-w-md md:w-80 lg:w-[380px] xl:w-[420px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-200"
          : "relative w-full max-w-md md:max-w-lg animate-slideLeft"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>Schedule & Availability</span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Inspect colleague&apos;s daily agenda & conflicts
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Close schedule"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Staff Profile Card */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 flex items-start gap-3.5">
          {staff.photoURL ? (
            <img
              src={staff.photoURL}
              alt={staffName}
              className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-2 ring-amber-500/20"
            />
          ) : (
            <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm`}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                {staffName}
              </h4>
              {staff.accountStatus && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  staff.accountStatus === "active"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                }`}>
                  {staff.accountStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {staff.department ? `${staff.department.toUpperCase()} Department` : staff.email}
            </p>
            {staff.departmentPosition && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                <Briefcase className="w-3 h-3" />
                <span>{staff.departmentPosition}</span>
              </p>
            )}
          </div>
        </div>

        {/* Date Navigator & Filter Card */}
        <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-amber-950/30 dark:to-zinc-900 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl p-3 space-y-3 shadow-xs">
          
          {/* Day Stepper Header */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-amber-200/50 dark:border-zinc-700 hover:bg-amber-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors shadow-2xs"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center min-w-0 px-1">
              <p className="text-xs md:text-sm font-black text-gray-900 dark:text-white truncate">
                {friendlyDateStr(currentDate)}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                {isCurrentToday && (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                    TODAY
                  </span>
                )}
                {cleanTargetDate && isCurrentTarget && !isCurrentToday && (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                    MEETING DATE
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => changeDateByDays(1)}
              className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-amber-200/50 dark:border-zinc-700 hover:bg-amber-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors shadow-2xs"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 7-Day Quick Strip */}
          <div className="grid grid-cols-7 gap-1 pt-1 border-t border-amber-200/40 dark:border-amber-900/40">
            {weekStrip.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setCurrentDate(day.dateStr)}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                  day.isSelected
                    ? "bg-amber-500 text-white font-bold shadow-sm ring-2 ring-amber-500/30"
                    : day.isTarget
                    ? "bg-amber-100/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold"
                    : "bg-white/80 dark:bg-zinc-800/80 hover:bg-amber-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-zinc-700/60"
                }`}
                title={friendlyDateStr(day.dateStr)}
              >
                <span className={`text-[9px] uppercase ${day.isSelected ? "text-amber-100" : "text-gray-400 dark:text-gray-500"}`}>
                  {day.dayOfWeek}
                </span>
                <span className="text-xs font-bold leading-tight mt-0.5">
                  {day.dayNum}
                </span>
                {/* Indicator dot (only shown if blocked or has scheduled activities; no dot if day is free) */}
                {day.isBlocked ? (
                  <span className="w-1.5 h-1.5 rounded-full mt-1 bg-rose-500 shrink-0" />
                ) : day.hasActivities ? (
                  <span className="w-1.5 h-1.5 rounded-full mt-1 bg-amber-400 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 mt-1 shrink-0 opacity-0" />
                )}
              </button>
            ))}
          </div>

          {/* Quick jump actions & Date Picker input */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/40 dark:border-amber-900/30">
            <div className="flex items-center gap-1.5">
              {!isCurrentToday && (
                <button
                  type="button"
                  onClick={() => setCurrentDate(todayStr)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-amber-200/60 dark:border-zinc-700 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-50 transition-colors shadow-2xs"
                >
                  Today
                </button>
              )}
              {cleanTargetDate && !isCurrentTarget && (
                <button
                  type="button"
                  onClick={() => setCurrentDate(cleanTargetDate)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold hover:bg-amber-600 transition-colors shadow-2xs"
                >
                  Meeting Date
                </button>
              )}
            </div>

            {/* Native Date Picker */}
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-amber-200/80 dark:border-zinc-700 rounded-xl px-2 py-1 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                type="date"
                value={currentDate}
                onChange={e => {
                  if (e.target.value) {
                    setCurrentDate(e.target.value.trim());
                  }
                }}
                className="bg-transparent text-[11px] font-bold text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                title="Select any date"
              />
            </div>
          </div>
        </div>

        {/* Real-time Daily Status & Arrangement Banner */}
        {arrangement.isBlocked ? (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    {arrangement.badge || "Unavailable"}
                  </h5>
                  <span className="text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.2 rounded-full bg-rose-200/60 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">
                    Blocked
                  </span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  {arrangement.details}
                </p>
              </div>
            </div>
            {arrangement.leaveInfo && (
              <div className="mt-2 text-[11px] bg-white/60 dark:bg-zinc-900/60 p-2 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
                <span className="font-bold">Leave Duration:</span> {arrangement.leaveInfo.startDate} to {arrangement.leaveInfo.endDate}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Available & Ready
              </h5>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                No leave or conflicting meeting scheduled for this day.
              </p>
            </div>
          </div>
        )}

        {/* Working Shift Information */}
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" /> Working Shift
            </span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {staff.shiftStatus ? staff.shiftStatus.toUpperCase() : "STANDARD"}
            </span>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {staff.shiftStartTime && staff.shiftEndTime
              ? `${staff.shiftStartTime} – ${staff.shiftEndTime}`
              : "Standard business hours (09:00 – 17:00)"}
          </p>
        </div>

        {/* Day Schedule Timeline */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Day Agenda ({dayActivities.length})</span>
            </h5>
            <span className="text-[10px] text-gray-400 font-semibold">
              {friendlyDateStr(currentDate)}
            </span>
          </div>

          {dayActivities.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-center space-y-1.5 bg-gray-50/50 dark:bg-zinc-900/50">
              <Coffee className="w-6 h-6 text-gray-400 mx-auto stroke-[1.5]" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                No Scheduled Activities
              </p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                {staffName} has no meetings, tasks, or events scheduled for this day.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayActivities.map(act => {
                const isHost = act.createdBy === staff.id;
                const rsvp = staff.id ? act.rsvps?.[staff.id] : undefined;
                const isDeclined = rsvp === "declined";
                const isAccepted = rsvp === "accepted";

                let rsvpBadgeText = "Invited";
                let rsvpBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
                if (isHost) {
                  rsvpBadgeText = "Host";
                  rsvpBadgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
                } else if (isAccepted) {
                  rsvpBadgeText = "Accepted";
                  rsvpBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                } else if (isDeclined) {
                  rsvpBadgeText = "Declined (Free)";
                  rsvpBadgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
                }

                const timeDisplay = act.allDay
                  ? "All Day"
                  : `${act.startTime || "00:00"}${act.endTime ? ` – ${act.endTime}` : ""}`;

                return (
                  <div
                    key={act.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isDeclined
                        ? "bg-gray-50/70 dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 opacity-75"
                        : "bg-white dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-amber-500" />
                          {timeDisplay}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {act.category}
                        </span>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${rsvpBadgeClass}`}>
                        {rsvpBadgeText}
                      </span>
                    </div>

                    <h6 className="text-xs font-bold text-gray-900 dark:text-white mt-1.5 truncate">
                      {act.title}
                    </h6>

                    {act.description && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {act.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 pt-1 border-t border-gray-100 dark:border-zinc-700/60">
                      <span>Organized by {act.createdByName || "Staff"}</span>
                      {isDeclined && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Free during this slot
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Schedule Glance */}
        {upcomingActivities.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Upcoming Activities ({upcomingActivities.length})</span>
            </h5>
            <div className="space-y-1.5">
              {upcomingActivities.map(act => {
                const actDateStr = act.date ? String(act.date).trim().split("T")[0] : "";
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => actDateStr && setCurrentDate(actDateStr)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-gray-100 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all text-left group"
                    title={`View schedule on ${friendlyDateStr(actDateStr)}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        {act.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {friendlyDateStr(actDateStr)} {act.startTime ? `· ${act.startTime}` : ""}
                      </p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gray-200/70 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 shrink-0 ml-2">
                      {act.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/60 flex items-center gap-2.5 shrink-0">
        {onToggleInvite && (
          <button
            type="button"
            onClick={() => onToggleInvite(staff.id)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              isInvited
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : arrangement.isBlocked
                ? "bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/40"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            }`}
          >
            {isInvited ? (
              <>
                <X className="w-4 h-4" />
                <span>Remove from Invitees</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{arrangement.isBlocked ? "Invite Anyway (Has Conflict)" : "Add to Invitees"}</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (mode === "docked") {
    return (
      <div
        className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-black/50 max-md:backdrop-blur-xs max-md:flex max-md:justify-end md:h-full md:flex md:shrink-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {panelContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {panelContent}
    </div>
  );
}
