"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribePayments = subscribePayments;
exports.updatePaymentStatus = updatePaymentStatus;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
function mapType(t) {
    if (t === 'salary')
        return 'Payroll';
    if (t === 'bonus')
        return 'Incoming';
    if (t === 'reimbursement')
        return 'Outgoing';
    return 'Refund';
}
function mapStatus(s) {
    if (s === 'paid')
        return 'Completed';
    if (s === 'pending')
        return 'Pending';
    if (s === 'failed')
        return 'Rejected';
    return 'Pending';
}
function fmt(ts) {
    if (!ts)
        return '-';
    if (typeof ts === 'string')
        return ts;
    if (ts.toDate)
        return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
}
/** Subscribe to all payment records ordered by date (newest first). */
function subscribePayments(cb) {
    const q = (0, firestore_1.query)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), 'payments'), (0, firestore_1.orderBy)('date', 'desc'));
    return (0, firestore_1.onSnapshot)(q, (snap) => {
        cb(snap.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                amount: (data.amount || 0),
                type: mapType(data.type),
                status: mapStatus(data.status),
                description: (data.description || ''),
                requestedBy: (data.staffName || data.requestedBy || 'Staff Member'),
                approvedBy: data.status === 'paid' ? 'Agunwami' : '-',
                created: fmt(data.date),
                processed: data.status === 'paid' ? fmt(data.date) : '-',
            };
        }));
    }, (err) => console.warn('[agunwami-backend] Payments snapshot error:', err));
}
/** Update payment status (e.g. approve / mark paid) */
async function updatePaymentStatus(id, status) {
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)((0, firebase_instance_1.getDb)(), 'payments', id), {
        status,
        updatedAt: (0, firestore_1.serverTimestamp)(),
    });
}
