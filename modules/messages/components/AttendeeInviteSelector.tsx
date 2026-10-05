"use client";

import React, { useState, useMemo } from "react";
import {
  Search, X, Check, UserPlus, Users, MessageSquare,
  Calendar, Clock, AlertCircle, Building2, ChevronRight
} from "lucide-react";
import {
  checkStaffArrangement,
  ApprovedLeaveRecord,
} from "@/utils/staffArrangementUtils";
import UserScheduleDrawer from "./UserScheduleDrawer";

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

export interface Conversation {
  id: string;
  name?: string;
  type?: "direct" | "group" | "community";
  memberIds: Record<string, boolean>;
  adminIds?: Record<string, boolean>;
  createdById?: string;
  description?: string;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageAt?: number;
  unreadCount?: Record<string, number>;
  avatarColor?: string;
  initials?: string;
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

export interface AttendeeInviteSelectorProps {
  myUid: string;
  memberProfiles: Record<string, any>;
  conversations: Conversation[];
  invitedUserIds: string[];
  invitedConvoIds: string[];
  onToggleUser: (userId: string) => void;
  onToggleConvo: (convoId: string) => void;
  onClearAll?: () => void;
  targetDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  plannedAllDay?: boolean;
  currentActivityId?: string;
  activities: any[];
  approvedLeaves?: ApprovedLeaveRecord[];
  maxListHeightClass?: string;
  onOpenSchedule?: (staff: StaffMember) => void;
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

export default function AttendeeInviteSelector({
  myUid,
  memberProfiles,
  conversations,
  invitedUserIds,
  invitedConvoIds,
  onToggleUser,
  onToggleConvo,
  onClearAll,
  targetDate,
  plannedStartTime,
  plannedEndTime,
  plannedAllDay,
  currentActivityId,
  activities = [],
  approvedLeaves = [],
  maxListHeightClass = "max-h-72",
  onOpenSchedule,
}: AttendeeInviteSelectorProps) {
  const [inviteTab, setInviteTab] = useState<"staff" | "group" | "community">("staff");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [scheduleDrawerStaff, setScheduleDrawerStaff] = useState<StaffMember | null>(null);

  // All other staff
  const allStaff = useMemo(() => {
    return Object.values(memberProfiles).filter(u => u && u.id && u.id !== myUid) as StaffMember[];
  }, [memberProfiles, myUid]);

  // Unique departments present in staff directory
  const departments = useMemo(() => {
    const depts = new Set<string>();
    allStaff.forEach(s => {
      if (s.department && typeof s.department === "string") {
        depts.add(s.department.toLowerCase());
      }
    });
    return Array.from(depts).sort();
  }, [allStaff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return allStaff.filter(u => {
      const q = searchQuery.trim().toLowerCase();
      const name = (u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const dept = (u.department || "").toLowerCase();
      const pos = (u.departmentPosition || "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || dept.includes(q) || pos.includes(q);
      const matchesDept = selectedDepartment === "all" || dept === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [allStaff, searchQuery, selectedDepartment]);

  // Groups and Communities
  const groups = useMemo(() => conversations.filter(c => c.type === "group"), [conversations]);
  const communities = useMemo(() => conversations.filter(c => c.type === "community"), [conversations]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter(g => !q || (g.name || "").toLowerCase().includes(q));
  }, [groups, searchQuery]);

  const filteredCommunities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return communities.filter(c => !q || (c.name || "").toLowerCase().includes(q));
  }, [communities, searchQuery]);

  const totalSelected = invitedUserIds.length + invitedConvoIds.length;

  return (
    <div className="space-y-2.5">
      {/* Header bar with Count and Clear All */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>Invite Attendees</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Search all company staff or invite whole groups
          </p>
        </div>

        {totalSelected > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {totalSelected} selected
            </span>
            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected badge pills strip */}
      {totalSelected > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 max-h-24 overflow-y-auto">
          {invitedConvoIds.map(cid => {
            const convo = conversations.find(c => c.id === cid);
            const name = convo?.name || "Group";
            return (
              <span
                key={cid}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-zinc-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs"
              >
                <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate max-w-[130px]">{name}</span>
                <button
                  type="button"
                  onClick={() => onToggleConvo(cid)}
                  className="hover:text-rose-600 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {invitedUserIds.map(uid => {
            const p = memberProfiles[uid];
            const name = p?.displayName || p?.email || "Staff";
            const color = colorFromStr(name);
            const initials = getInitials(name);
            return (
              <span
                key={uid}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-zinc-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs"
              >
                {p?.photoURL ? (
                  <img src={p.photoURL} alt={name} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                ) : (
                  <span className={`w-3.5 h-3.5 rounded-full ${color} text-white flex items-center justify-center text-[8px] font-bold shrink-0`}>
                    {initials[0]}
                  </span>
                )}
                <span className="truncate max-w-[120px]">{name}</span>
                <button
                  type="button"
                  onClick={() => onToggleUser(uid)}
                  className="hover:text-rose-600 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Segmented Tabs: Staff | Groups | Communities */}
      <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setInviteTab("staff")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            inviteTab === "staff"
              ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff ({allStaff.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setInviteTab("group")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            inviteTab === "group"
              ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Groups ({groups.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setInviteTab("community")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            inviteTab === "community"
              ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span>#</span>
          <span>Channels ({communities.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={
            inviteTab === "staff"
              ? "Search staff by name, email, or role..."
              : `Search ${inviteTab === "group" ? "groups" : "community channels"}...`
          }
          className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Department Filter Chips for Staff tab */}
      {inviteTab === "staff" && departments.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedDepartment("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              selectedDepartment === "all"
                ? "bg-amber-500 text-white shadow-2xs"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
            }`}
          >
            All Departments ({allStaff.length})
          </button>
          {departments.map(dept => {
            const count = allStaff.filter(s => (s.department || "").toLowerCase() === dept).length;
            const isSel = selectedDepartment === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDepartment(dept)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 capitalize transition-all ${
                  isSel
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Main Attendees Selection List */}
      <div className={`${maxListHeightClass} overflow-y-auto space-y-1.5 bg-gray-50/70 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/80 rounded-2xl p-2`}>
        {inviteTab === "staff" && (
          <>
            {filteredStaff.map(u => {
              const isSelected = invitedUserIds.includes(u.id);
              const name = u.displayName || u.email || "Staff Member";
              const initials = getInitials(name);
              const color = colorFromStr(name);

              const arrangement = checkStaffArrangement({
                staffId: u.id,
                staffMember: u,
                targetDate,
                startTime: plannedAllDay ? undefined : plannedStartTime,
                endTime: plannedAllDay ? undefined : plannedEndTime,
                allDay: plannedAllDay,
                currentActivityId,
                activities: activities as any,
                approvedLeaves,
                type: "meet",
              });

              const isBlocked = arrangement.isBlocked;

              return (
                <div
                  key={u.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-2xs"
                      : isBlocked
                      ? "bg-gray-100/60 dark:bg-zinc-900/60 border-gray-200/70 dark:border-zinc-800 opacity-80"
                      : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-600"
                  }`}
                >
                  {/* Avatar & Staff Details */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={name}
                        className="w-8 h-8 rounded-xl object-cover shrink-0 ring-1 ring-black/5"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-xl ${color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-gray-900 dark:text-white truncate max-w-[140px] md:max-w-[170px]">
                          {name}
                        </span>
                        {isBlocked && arrangement.badge && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-0.5 shrink-0">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            {arrangement.badge}
                          </span>
                        )}
                        {!isBlocked && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            Available
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {u.department ? `${u.department.toUpperCase()}` : ""}{u.departmentPosition ? ` · ${u.departmentPosition}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Actions: View Schedule & Invite Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* View Schedule Drawer Button */}
                    <button
                      type="button"
                      onClick={() => onOpenSchedule ? onOpenSchedule(u) : setScheduleDrawerStaff(u)}
                      title={`View ${name}'s schedule`}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-zinc-700/70 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-gray-700 dark:text-gray-200 hover:text-amber-800 dark:hover:text-amber-300 transition-colors flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="hidden sm:inline">Schedule</span>
                    </button>

                    {/* Invite Button */}
                    <button
                      type="button"
                      onClick={() => onToggleUser(u.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 shadow-2xs ${
                        isSelected
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : isBlocked
                          ? "bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-rose-100 hover:text-rose-700"
                          : "bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Invited</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Invite</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStaff.length === 0 && (
              <div className="py-8 text-center space-y-1">
                <Users className="w-6 h-6 text-gray-400 mx-auto stroke-[1.5]" />
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400">No staff members found</p>
                <p className="text-[11px] text-gray-400">Try changing your search or department filter</p>
              </div>
            )}
          </>
        )}

        {(inviteTab === "group" || inviteTab === "community") && (
          <>
            {(inviteTab === "group" ? filteredGroups : filteredCommunities).map(c => {
              const memberUids = Object.keys(c.memberIds || {}).filter(id => id !== myUid);
              const isGroupSelected = invitedConvoIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isGroupSelected
                      ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-2xs"
                      : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {inviteTab === "group" ? <MessageSquare className="w-4 h-4" /> : <span className="font-bold">#</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate">
                        {c.name || (inviteTab === "group" ? "Group" : "Channel")}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {memberUids.length} staff member{memberUids.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleConvo(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                      isGroupSelected
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 hover:text-amber-800"
                    }`}
                  >
                    {isGroupSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Invited</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        <span>Invite Group</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}

            {(inviteTab === "group" ? filteredGroups : filteredCommunities).length === 0 && (
              <div className="py-8 text-center space-y-1">
                <MessageSquare className="w-6 h-6 text-gray-400 mx-auto stroke-[1.5]" />
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  No {inviteTab === "group" ? "groups" : "community channels"} found
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Schedule Drawer (only used when onOpenSchedule is not passed) */}
      {!onOpenSchedule && (
        <UserScheduleDrawer
          isOpen={!!scheduleDrawerStaff}
          onClose={() => setScheduleDrawerStaff(null)}
          staff={scheduleDrawerStaff}
          targetDate={targetDate}
          plannedStartTime={plannedStartTime}
          plannedEndTime={plannedEndTime}
          plannedAllDay={plannedAllDay}
          activities={activities}
          approvedLeaves={approvedLeaves}
          onToggleInvite={onToggleUser}
          isInvited={scheduleDrawerStaff ? invitedUserIds.includes(scheduleDrawerStaff.id) : false}
        />
      )}
    </div>
  );
}
