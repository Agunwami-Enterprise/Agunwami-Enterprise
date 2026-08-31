"use strict";
// ─── Leave Request Service ────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeLeaveRequests = subscribeLeaveRequests;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
const time_1 = require("../utils/time");
function mapStatus(s) {
    if (s === 'approved')
        return 'Approved';
    if (s === 'rejected')
        return 'Rejected';
    return 'Pending';
}
function mapType(t) {
    const map = {
        annual: 'Annual Leave',
        sick: 'Sick Leave',
        unpaid: 'Personal Leave',
        maternity: 'Maternity Leave',
        paternity: 'Paternity Leave',
    };
    return map[t] ?? t;
}
/** Subscribe to all leave requests ordered by start date (newest first). */
function subscribeLeaveRequests(cb) {
    const q = (0, firestore_1.query)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), 'leaveRequests'), (0, firestore_1.orderBy)('startDate', 'desc'));
    return (0, firestore_1.onSnapshot)(q, (snap) => {
        cb(snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                employee: (data.userName || data.staffName || 'Staff Member'),
                aehubId: data.aehubId,
                type: mapType(data.leaveType),
                startDate: (0, time_1.fmtDate)(data.startDate),
                endDate: (0, time_1.fmtDate)(data.endDate || data.startDate),
                days: (data.days || data.daysRequested || 1),
                status: mapStatus(data.status),
                reason: data.reason,
            };
        }));
    }, (err) => console.warn('[agunwami-backend] LeaveRequests snapshot error:', err));
}
