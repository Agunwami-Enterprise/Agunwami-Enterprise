"use strict";
// ─── Tasks Service ────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeTasks = subscribeTasks;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
function mapStatus(s, dueDate) {
    if (s === 'completed')
        return 'Completed';
    if (s === 'in-review')
        return 'In Progress';
    if (s === 'in-progress')
        return dueDate < new Date() ? 'Overdue' : 'In Progress';
    return dueDate < new Date() ? 'Overdue' : 'Pending';
}
function mapPriority(p) {
    return p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low';
}
async function loadNameMap() {
    const m = new Map();
    try {
        const snap = await (0, firestore_1.getDocs)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), 'users'));
        snap.docs.forEach((d) => {
            const data = d.data();
            m.set(d.id, data.displayName ?? data.name ?? d.id);
        });
    }
    catch {
        // Name map load failure is non-fatal
    }
    return m;
}
/** Subscribe to staff tasks ordered by creation date (newest first). */
function subscribeTasks(cb) {
    let realUnsub = () => { };
    loadNameMap().then(names => {
        const q = (0, firestore_1.query)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), 'staffTasks'), (0, firestore_1.orderBy)('createdAt', 'desc'));
        realUnsub = (0, firestore_1.onSnapshot)(q, (snap) => {
            cb(snap.docs.map((d) => {
                const data = d.data();
                let due = new Date();
                if (data.dueDate) {
                    due = typeof data.dueDate === 'string'
                        ? new Date(data.dueDate)
                        : (data.dueDate.toDate ? data.dueDate.toDate() : new Date());
                }
                return {
                    id: d.id,
                    title: (data.title || data.task || 'Task'),
                    assignee: names.get(data.assignedTo) ?? data.assignee ?? 'Staff Member',
                    dueDate: due.toISOString().split('T')[0],
                    status: mapStatus(data.status, due),
                    priority: mapPriority(data.priority),
                };
            }));
        }, (err) => {
            if (err.code !== 'permission-denied') {
                console.warn('[agunwami-backend] Tasks snapshot error:', err);
            }
        });
    }).catch(() => { });
    return () => realUnsub();
}
__exportStar(require("./staff-tasks"), exports);
