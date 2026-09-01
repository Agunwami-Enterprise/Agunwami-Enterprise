"use strict";
// ─── Notifications Service ────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeForNotif = routeForNotif;
exports.markNotifRead = markNotifRead;
exports.markAllNotifsRead = markAllNotifsRead;
exports.subscribeNotifications = subscribeNotifications;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
const time_1 = require("../utils/time");
const COLLECTION_ROUTES = {
    tasks: '/ceo/tasks',
    leaveRequests: '/ceo/leave-requests',
    payments: '/ceo/payments',
    messages: '/ceo/messages',
    documents: '/ceo/documents',
    training: '/ceo/training',
    staff: '/ceo/staff',
    announcements: '/ceo/dashboard',
};
function routeForNotif(n) {
    const col = n.relatedTo?.collection;
    if (!col)
        return '/ceo/notifications';
    return COLLECTION_ROUTES[col] ?? '/ceo/notifications';
}
function typeToTitle(type) {
    const map = {
        task_assigned: 'New Task Assigned',
        leave_approved: 'Leave Request Update',
        payment_processed: 'Payment Update',
        announcement: 'Company Announcement',
        message: 'New Message',
    };
    return map[type] ?? 'Notification';
}
function typeToCategory(type) {
    if (type.includes('task'))
        return 'tasks';
    if (type.includes('payment'))
        return 'payments';
    if (type.includes('message'))
        return 'messages';
    return 'updates';
}
function typeToIcon(type) {
    if (type.includes('task'))
        return { bg: '#fee2e2', color: '#ef4444' };
    if (type.includes('payment'))
        return { bg: '#dbeafe', color: '#2563eb' };
    if (type.includes('message'))
        return { bg: '#dcfce7', color: '#16a34a' };
    return { bg: '#fef9c3', color: '#d97706' };
}
/** Mark a single notification as read. */
async function markNotifRead(id) {
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)((0, firebase_instance_1.getDb)(), 'notifications', id), { read: true });
}
/** Mark multiple notifications as read in a single batch write. */
async function markAllNotifsRead(ids) {
    if (!ids.length)
        return;
    const batch = (0, firestore_1.writeBatch)((0, firebase_instance_1.getDb)());
    ids.forEach(id => batch.update((0, firestore_1.doc)((0, firebase_instance_1.getDb)(), 'notifications', id), { read: true }));
    await batch.commit();
}
/** Subscribe to all notifications for a given user (newest first). */
function subscribeNotifications(uid, cb) {
    if (!uid) {
        cb([]);
        return () => { };
    }
    try {
        const q = (0, firestore_1.query)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), 'notifications'), (0, firestore_1.where)('recipientId', '==', uid), (0, firestore_1.orderBy)('createdAt', 'desc'));
        return (0, firestore_1.onSnapshot)(q, (snap) => {
            cb(snap.docs.map((d) => {
                const data = d.data();
                const type = (data.type || 'notification');
                const icon = typeToIcon(type);
                const read = !!data.read;
                return {
                    id: d.id,
                    title: typeToTitle(type),
                    body: (data.message || data.body || ''),
                    time: (0, time_1.relativeTime)(data.createdAt),
                    tag: read ? '' : 'NEW',
                    tagColor: read ? '' : '#ef4444',
                    read,
                    iconBg: icon.bg,
                    iconColor: icon.color,
                    category: typeToCategory(type),
                    relatedTo: data.relatedTo,
                };
            }));
        }, (err) => {
            if (err.code !== 'permission-denied') {
                console.warn('[agunwami-backend] Notifications snapshot error:', err);
            }
        });
    }
    catch (err) {
        console.warn('[agunwami-backend] subscribeNotifications error:', err);
        cb([]);
        return () => { };
    }
}
