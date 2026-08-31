"use strict";
// ─── Staff Service ────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeStaff = subscribeStaff;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
const user_1 = require("../types/user");
const PALETTE = [
    '#f5bd02', '#8b5cf6', '#3b82f6', '#22c55e', '#7c3aed',
    '#0d9488', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
    '#dc2626', '#84cc16',
];
function colorFor(uid) {
    let h = 0;
    for (let i = 0; i < uid.length; i++)
        h = (h * 31 + uid.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
}
function toMember(id, data) {
    const name = (0, user_1.getStaffDisplayName)(data);
    const statusStr = (data.status || 'Active');
    let status = 'Active';
    if (statusStr.toLowerCase() === 'inactive')
        status = 'Inactive';
    else if (statusStr.toLowerCase() === 'on leave' || statusStr.toLowerCase() === 'leave')
        status = 'On Leave';
    else if (statusStr.toLowerCase() === 'suspended' || data.isSuspended || data.accountStatus === 'suspended')
        status = 'Suspended';
    else if (statusStr.toLowerCase() === 'fired' || data.isFired || data.accountStatus === 'fired')
        status = 'Fired';
    let clockStatus = 'Clocked Out';
    if (statusStr === 'Clocked In')
        clockStatus = 'Clocked In';
    else if (statusStr === 'On Break')
        clockStatus = 'On Break';
    return {
        id,
        name,
        email: (data.email || ''),
        phone: (0, user_1.getStaffPhone)(data),
        role: 'staff',
        department: (data.department || ''),
        departmentPosition: (0, user_1.getStaffPosition)(data),
        departmentPermissions: (0, user_1.getStaffPermissions)(data),
        isDepartmentAdmin: !!data.isDepartmentAdmin,
        status,
        clockStatus,
        lastSeen: data.lastActiveTime ? new Date(data.lastActiveTime).toLocaleString() : new Date().toLocaleString(),
        initials: name.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || 'ST',
        color: colorFor(id),
        photoURL: (0, user_1.getStaffAvatar)(data),
        shiftStartTime: data.shiftStartTime,
        shiftEndTime: data.shiftEndTime,
    };
}
/** Subscribe to all staff in the `users` collection. */
function subscribeStaff(cb) {
    const q = (0, firestore_1.query)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), 'users'), (0, firestore_1.where)('role', '==', 'staff'));
    return (0, firestore_1.onSnapshot)(q, (snap) => cb(snap.docs.map((d) => toMember(d.id, d.data()))), (err) => console.warn('[agunwami-backend] Staff snapshot error:', err));
}
