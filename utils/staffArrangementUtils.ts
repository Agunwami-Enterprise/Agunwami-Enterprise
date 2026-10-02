/**
 * utils/staffArrangementUtils.ts
 *
 * Smart availability & arrangement validation for staff members.
 * Checks whether a staff member is under an arrangement (on approved leave,
 * conflicting meeting/event, suspended/inactive, or unavailable) that prevents
 * them from being assigned a task or invited to a meeting.
 */

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/workstation/firebase";

export interface ApprovedLeaveRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  leaveType?: string;
  status: string;
}

export interface StaffArrangementStatus {
  isBlocked: boolean;
  reason: "leave" | "conflict" | "account_status" | "off_shift" | null;
  badge: string;
  details: string;
  leaveInfo?: {
    startDate?: string;
    endDate?: string;
    leaveType?: string;
  };
  conflictingActivity?: {
    id: string;
    title: string;
    category: string;
    startTime?: string;
    endTime?: string;
  };
}

/**
 * Fetches all approved leave requests across the company.
 */
export async function fetchApprovedLeaves(): Promise<ApprovedLeaveRecord[]> {
  try {
    const q = query(collection(db, "leaveRequests"), where("status", "==", "approved"));
    const snap = await getDocs(q);
    const leaves: ApprovedLeaveRecord[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      const start = data.startDate || "";
      const end = data.endDate || start;
      if (start || end) {
        leaves.push({
          id: d.id,
          userId: data.userId || "",
          userName: data.userName || "",
          userEmail: data.userEmail || "",
          startDate: start,
          endDate: end,
          leaveType: data.leaveType || "Leave",
          status: data.status || "approved",
        });
      }
    });

    return leaves;
  } catch (err) {
    console.warn("fetchApprovedLeaves error:", err);
    return [];
  }
}

/**
 * Returns YYYY-MM-DD in local time without UTC offset bugs.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface CheckArrangementParams {
  staffId: string;
  staffMember?: any;
  targetDate?: string;      // "YYYY-MM-DD"
  startTime?: string;       // "HH:MM"
  endTime?: string;         // "HH:MM"
  allDay?: boolean;
  currentActivityId?: string;
  activities?: any[];       // all system activities
  approvedLeaves?: ApprovedLeaveRecord[];
  type?: "meet" | "task" | "general";
}

/**
 * Checks if a staff member is under any arrangement that prevents them from
 * being assigned or invited for a meet/task.
 */
export function checkStaffArrangement({
  staffId,
  staffMember,
  targetDate,
  startTime,
  endTime,
  allDay,
  currentActivityId,
  activities = [],
  approvedLeaves = [],
  type = "meet",
}: CheckArrangementParams): StaffArrangementStatus {
  if (!staffId) {
    return { isBlocked: false, reason: null, badge: "", details: "Available" };
  }

  const todayStr = getLocalDateString(new Date());
  const evalDate = targetDate ? String(targetDate).trim().split("T")[0] : todayStr;

  // 1. Check Account Status Arrangement (Suspended / Fired / Inactive)
  if (staffMember) {
    const accStatus = (staffMember.accountStatus || "").toLowerCase();
    const statusStr = (staffMember.status || "").toLowerCase();

    if (accStatus === "suspended" || staffMember.isSuspended || statusStr === "suspended") {
      return {
        isBlocked: true,
        reason: "account_status",
        badge: "Suspended",
        details: "Staff account is currently suspended and cannot be assigned or invited.",
      };
    }

    if (accStatus === "fired" || staffMember.isFired || statusStr === "fired") {
      return {
        isBlocked: true,
        reason: "account_status",
        badge: "Fired",
        details: "Staff member is no longer active in the organization.",
      };
    }

    if (accStatus === "inactive" || statusStr === "inactive") {
      return {
        isBlocked: true,
        reason: "account_status",
        badge: "Inactive",
        details: "Staff account is inactive.",
      };
    }
  }

  // 2. Check Approved Leave Arrangement
  const userLower = staffId.toLowerCase();
  const emailLower = (staffMember?.email || "").toLowerCase();
  const nameLower = (staffMember?.displayName || "").toLowerCase();

  const activeLeave = approvedLeaves.find((l) => {
    const matchUser =
      (l.userId && l.userId.toLowerCase() === userLower) ||
      (l.userEmail && l.userEmail.toLowerCase() === emailLower) ||
      (l.userName && l.userName.toLowerCase() === nameLower);

    if (!matchUser) return false;

    const start = l.startDate ? String(l.startDate).trim().split("T")[0] : "";
    const end = l.endDate ? String(l.endDate).trim().split("T")[0] : start;

    // Check if target evaluation date falls within the leave window
    return (!start || evalDate >= start) && (!end || evalDate <= end);
  });

  if (activeLeave) {
    const endFormatted = activeLeave.endDate ? `until ${activeLeave.endDate}` : "on leave";
    return {
      isBlocked: true,
      reason: "leave",
      badge: "On Leave",
      details: `On approved ${activeLeave.leaveType || "leave"} ${endFormatted}.`,
      leaveInfo: {
        startDate: activeLeave.startDate,
        endDate: activeLeave.endDate,
        leaveType: activeLeave.leaveType,
      },
    };
  }

  // Also check profile's flat onLeave / status fields if evaluating for today
  if (evalDate === todayStr && staffMember) {
    const statusStr = (staffMember.status || "").toLowerCase();
    const shiftStatus = (staffMember.shiftStatus || "").toLowerCase();
    if (statusStr === "on leave" || statusStr === "leave" || shiftStatus === "onleave" || staffMember.isOnLeave) {
      return {
        isBlocked: true,
        reason: "leave",
        badge: "On Leave",
        details: "Staff is currently on leave.",
      };
    }
  }

  // 3. Check Conflicting Activity / Meeting Arrangement (for Meetings & Events)
  if (type !== "task" && evalDate && activities.length > 0) {
    const planStart = startTime || "00:00";
    const planEnd = endTime || startTime || "23:59";

    const conflicting = activities.find((act) => {
      if (!act || act.id === currentActivityId) return false;
      const actDate = act.date ? String(act.date).trim().split("T")[0] : "";
      if (actDate !== evalDate) return false;

      // Only evaluate activities that involve this staff member
      const isInvited = act.invitedUsers && Array.isArray(act.invitedUsers) && act.invitedUsers.includes(staffId);
      const isHost = act.createdBy === staffId;
      if (!isInvited && !isHost) return false;

      // If the user declined RSVP (or RSVP expired), they are free and not attending this meeting
      const userRsvp = act.rsvps?.[staffId];
      if (!isHost && (userRsvp === "declined" || userRsvp === "expired")) {
        return false;
      }

      // Only meetings, events, or scheduled appointments cause conflicts
      const cat = (act.category || "").toLowerCase();
      if (cat !== "meeting" && cat !== "event") return false;

      // Check time overlap
      if (allDay || act.allDay) return true; // all day event blocks the whole day

      const actStart = act.startTime || "00:00";
      const actEnd = act.endTime || actStart;

      // Standard time interval overlap: (startA < endB) && (endA > startB)
      return planStart < actEnd && planEnd > actStart;
    });

    if (conflicting) {
      const timeStr = conflicting.startTime
        ? `${conflicting.startTime}${conflicting.endTime ? ` – ${conflicting.endTime}` : ""}`
        : "all-day";
      return {
        isBlocked: true,
        reason: "conflict",
        badge: "Busy: In Meeting",
        details: `Already booked for '${conflicting.title}' (${timeStr}).`,
        conflictingActivity: {
          id: conflicting.id,
          title: conflicting.title,
          category: conflicting.category,
          startTime: conflicting.startTime,
          endTime: conflicting.endTime,
        },
      };
    }
  }

  // Staff is completely free and available
  return {
    isBlocked: false,
    reason: null,
    badge: "",
    details: "Available",
  };
}
