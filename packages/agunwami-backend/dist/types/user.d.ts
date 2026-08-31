export type AccountStatus = 'active' | 'suspended' | 'fired';
export type ShiftStatus = 'onshift' | 'offshift' | 'onleave' | 'onbreak';
/**
 * System access roles:
 * Strictly 'student' | 'staff'.
 *
 * NOTE: There is NO 'admin' or 'super-admin' role in the users collection.
 * Administrative, managerial, and departmental authorities are governed exclusively by:
 * 1. department (e.g. 'ceo', 'operations', 'hr', 'content-team', 'developers', 'finance', 'it', 'customer-care')
 * 2. isDepartmentAdmin (boolean - whether staff member is the lead/admin of the department)
 * 3. departmentPermissions (string[] - e.g. ['admin', 'staff-management', 'create-task', 'approve-leave'])
 * 4. departmentPosition (string - job title, e.g. 'Lead Content Creator', 'Operations Manager', 'CEO')
 */
export type UserRole = 'student' | 'staff';
export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phone?: string | null;
    /** System access role: strictly 'student' | 'staff' */
    role: UserRole;
    createdAt: number;
    country: string | null;
    bio: string | null;
    workExperience: string | null;
    education: string | null;
    skills: string[];
    certificates: string[];
    location?: string;
    joinDate?: string;
    /** Department slug (e.g. 'content-team', 'operations', 'developers', 'ceo', 'hr', 'finance', 'it', 'customer-care') */
    department?: string | null;
    /** Staff job title / designation (e.g. 'Lead Developer', 'Operations Manager', 'CEO', 'Content Specialist') */
    departmentPosition?: string | null;
    /** Department-specific and administrative permissions (e.g. ['admin', 'staff-management', 'create-task']) */
    departmentPermissions?: string[];
    /** Whether the staff member has department administration privileges */
    isDepartmentAdmin?: boolean;
    /** Generated official staff ID (e.g. 'AEHUB-0004-0012') */
    aehubId?: string | null;
    /** Sequential staff number */
    staffNumber?: number | null;
    /** Attendance record list of dates ('YYYY-MM-DD') */
    attendedDates?: string[];
    /** Timestamp of most recent user activity */
    lastActiveTime?: number;
    xp?: number;
    medals?: number;
    learningStreak?: number;
    learningHours?: number;
    lastLearningDate?: string;
    aenumber?: number;
    careerGoal?: string;
    careerGoalDate?: number;
    lastStreakReset?: string;
    receiveEmailNotifications?: boolean;
    emailPreferences?: {
        newCourses?: boolean;
        newCareers?: boolean;
        courseUpdates?: boolean;
    };
    chatbotUsageCount?: number;
    lastChatbotUsageDate?: string;
    /** Clock status: 'Clocked In' | 'Clocked Out' | 'On Break' | 'On Leave' | 'Off Shift' */
    status?: string;
    clockInTime?: number;
    clockOutTime?: number;
    dailyMs?: number;
    weeklyMs?: number;
    lastClockOutDate?: string;
    lastClockOutWeek?: string;
    breakStartTime?: number | null;
    sessionRevocationCount?: number;
    forceLogoutTime?: number | null;
    loggedOutFromAllDevices?: boolean;
    revocationId?: string;
    deleteRequestedAt?: number | null;
    /** Controls login access and clock-in (active | suspended | fired) */
    accountStatus?: AccountStatus;
    /** Shift eligibility (onshift | offshift | onleave | onbreak) */
    shiftStatus?: ShiftStatus;
    /** HH:mm format, e.g. "09:00". Defaults to DEFAULT_SHIFT_START if unset. */
    shiftStartTime?: string;
    /** HH:mm format, e.g. "17:00". Defaults to DEFAULT_SHIFT_END if unset. */
    shiftEndTime?: string;
}
/** Helper to extract canonical display name from a user profile or document */
export declare function getStaffDisplayName(user: Partial<UserProfile> | Record<string, any> | null | undefined): string;
/** Helper to extract avatar photo URL */
export declare function getStaffAvatar(user: Partial<UserProfile> | Record<string, any> | null | undefined): string | undefined;
/** Helper to extract phone number */
export declare function getStaffPhone(user: Partial<UserProfile> | Record<string, any> | null | undefined): string | undefined;
/** Helper to extract staff job title / position */
export declare function getStaffPosition(user: Partial<UserProfile> | Record<string, any> | null | undefined): string;
/** Helper to extract department permissions */
export declare function getStaffPermissions(user: Partial<UserProfile> | Record<string, any> | null | undefined): string[];
