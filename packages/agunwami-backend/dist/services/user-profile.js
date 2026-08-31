"use strict";
// ─── User Profile Service ─────────────────────────────────────────────────────
// Real-time subscription to a user's profile document in Firestore.
// Maps the raw `users/{uid}` document to the canonical UserProfile shape.
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeUserProfile = subscribeUserProfile;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
const user_1 = require("../types/user");
const shift_1 = require("../constants/shift");
/**
 * Subscribes to the user's Firestore profile in real time.
 * Calls `cb` immediately and on every update.
 * Returns an unsubscribe function.
 */
function subscribeUserProfile(uid, cb) {
    if (!uid) {
        cb(null);
        return () => { };
    }
    const db = (0, firebase_instance_1.getDb)();
    return (0, firestore_1.onSnapshot)((0, firestore_1.doc)(db, 'users', uid), (snap) => {
        if (!snap.exists()) {
            cb(null);
            return;
        }
        const d = snap.data();
        // System role is strictly 'student' | 'staff'
        const role = (d.role === 'student' ? 'student' : 'staff');
        cb({
            // ── Identity ──────────────────────────────────────────────────────────
            uid,
            email: d.email ?? null,
            displayName: (0, user_1.getStaffDisplayName)(d),
            photoURL: (0, user_1.getStaffAvatar)(d) ?? null,
            phone: (0, user_1.getStaffPhone)(d) ?? null,
            role,
            createdAt: d.createdAt ?? 0,
            // ── Profile ───────────────────────────────────────────────────────────
            country: d.country ?? null,
            bio: d.bio ?? null,
            workExperience: d.workExperience ?? null,
            education: d.education ?? null,
            skills: d.skills ?? [],
            certificates: d.certificates ?? [],
            location: d.location,
            joinDate: d.joinDate
                ? (typeof d.joinDate === 'string'
                    ? d.joinDate
                    : (d.joinDate.toDate ? d.joinDate.toDate().toISOString().split('T')[0] : undefined))
                : undefined,
            // ── Staff / department ────────────────────────────────────────────────
            department: d.department ?? null,
            departmentPosition: (0, user_1.getStaffPosition)(d),
            departmentPermissions: (0, user_1.getStaffPermissions)(d),
            isDepartmentAdmin: d.isDepartmentAdmin ?? undefined,
            aehubId: d.aehubId ?? null,
            staffNumber: d.staffNumber ?? null,
            lastActiveTime: d.lastActiveTime ?? undefined,
            attendedDates: d.attendedDates ?? undefined,
            // ── Gamification (aehub student features — unused by ae-ws) ───────────
            xp: d.xp,
            medals: d.medals,
            learningStreak: d.learningStreak,
            learningHours: d.learningHours,
            lastLearningDate: d.lastLearningDate,
            aenumber: d.aenumber,
            careerGoal: d.careerGoal,
            careerGoalDate: d.careerGoalDate,
            lastStreakReset: d.lastStreakReset,
            // ── Notifications ─────────────────────────────────────────────────────
            receiveEmailNotifications: d.receiveEmailNotifications,
            emailPreferences: d.emailPreferences,
            chatbotUsageCount: d.chatbotUsageCount,
            lastChatbotUsageDate: d.lastChatbotUsageDate,
            // ── Clock-in state (flat fields on user doc) ──────────────────────────
            status: d.status ?? undefined,
            clockInTime: d.clockInTime ?? undefined,
            clockOutTime: d.clockOutTime ?? undefined,
            dailyMs: d.dailyMs ?? undefined,
            weeklyMs: d.weeklyMs ?? undefined,
            lastClockOutDate: d.lastClockOutDate ?? undefined,
            lastClockOutWeek: d.lastClockOutWeek ?? undefined,
            breakStartTime: d.breakStartTime ?? null,
            // ── Session management ────────────────────────────────────────────────
            sessionRevocationCount: d.sessionRevocationCount ?? undefined,
            forceLogoutTime: d.forceLogoutTime ?? null,
            loggedOutFromAllDevices: d.loggedOutFromAllDevices ?? undefined,
            revocationId: d.revocationId ?? undefined,
            deleteRequestedAt: d.deleteRequestedAt ?? null,
            // ── Employment status ─────────────────────────────────────────────────
            accountStatus: d.accountStatus ?? 'active',
            shiftStatus: d.shiftStatus ?? 'offshift',
            // ── Shift hours (only shiftStartTime & shiftEndTime) ─────────────────
            shiftStartTime: d.shiftStartTime || shift_1.DEFAULT_SHIFT_START,
            shiftEndTime: d.shiftEndTime || shift_1.DEFAULT_SHIFT_END,
        });
    }, (err) => {
        if (err.code !== 'permission-denied') {
            console.warn('[agunwami-backend] UserProfile snapshot error:', err);
        }
    });
}
