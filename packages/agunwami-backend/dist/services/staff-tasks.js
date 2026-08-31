"use strict";
// ─── Staff Tasks Service ────────────────────────────────────────────────────────
// Source: agunwami-backend/src/services/staff-tasks.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeStaffTasks = subscribeStaffTasks;
exports.createStaffTask = createStaffTask;
exports.updateStaffTask = updateStaffTask;
exports.deleteStaffTask = deleteStaffTask;
exports.fetchStaffUserNames = fetchStaffUserNames;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
/** Helper: Fetch all identifiers (userId, userName, userEmail) for staff members currently on leave */
async function getOnLeaveIdentifiers() {
    const onLeaveSet = new Set();
    const db = (0, firebase_instance_1.getDb)();
    // 1. Check approved leave requests in leaveRequests collection
    try {
        const leaveSnap = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(db, "leaveRequests"), (0, firestore_1.where)("status", "==", "approved")));
        leaveSnap.docs.forEach((d) => {
            const data = d.data();
            if (data.userId)
                onLeaveSet.add(String(data.userId).toLowerCase());
            if (data.userName)
                onLeaveSet.add(String(data.userName).toLowerCase());
            if (data.userEmail)
                onLeaveSet.add(String(data.userEmail).toLowerCase());
        });
    }
    catch (e) {
        console.error("[agunwami-backend] Error checking approved leaveRequests:", e);
    }
    // 2. Check users collection status === "On Leave" or "leave"
    try {
        const usersSnap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(db, "users"));
        usersSnap.docs.forEach((d) => {
            const data = d.data();
            const s = (data.status || "").toLowerCase();
            if (s === "on leave" || s === "leave") {
                onLeaveSet.add(d.id.toLowerCase());
                const name = data.displayName || data.name || data.email?.split("@")[0];
                if (name)
                    onLeaveSet.add(String(name).toLowerCase());
                if (data.email)
                    onLeaveSet.add(String(data.email).toLowerCase());
            }
        });
    }
    catch (e) {
        console.error("[agunwami-backend] Error checking users status:", e);
    }
    return onLeaveSet;
}
function subscribeStaffTasks(cb, onError) {
    const q = (0, firestore_1.query)((0, firestore_1.collection)((0, firebase_instance_1.getDb)(), "staffTasks"), (0, firestore_1.orderBy)("createdAt", "desc"));
    return (0, firestore_1.onSnapshot)(q, (snap) => {
        const items = snap.docs.map((d) => {
            const data = d.data();
            const startDate = data.startDate || "";
            const assignee = (data.assignee || "Unassigned");
            let stage = (data.stage || (assignee !== "Unassigned" ? "Assigned" : "Created"));
            // AUTOMATIC IN PROGRESS: Only if there is a start date and start date <= today
            if (stage === "Assigned" && startDate && assignee !== "Unassigned") {
                const startParsed = new Date(startDate);
                if (!isNaN(startParsed.getTime()) && startParsed <= new Date()) {
                    stage = "In Progress";
                }
            }
            return {
                id: d.id,
                title: (data.title || "Untitled Task"),
                assignee,
                assigneeUid: data.assigneeUid,
                description: data.description,
                startDate,
                dueDate: (data.dueDate || "8/14/2026"),
                stage,
                priority: (data.priority || "Low"),
                tags: data.tags || ["general"],
                department: (data.department || "Content Team"),
                createdBy: data.createdBy,
                createdByName: data.createdByName,
                createdAt: data.createdAt,
                isSprint: data.isSprint,
                subTasks: data.subTasks,
            };
        });
        cb(items);
    }, (err) => {
        console.warn("[agunwami-backend] staffTasks snapshot error:", err);
        if (onError)
            onError(err);
    });
}
async function createStaffTask(payload, currentUserId, currentUserName) {
    const db = (0, firebase_instance_1.getDb)();
    // Guard: Prevent assigning tasks to staff members currently on leave
    if (payload.assignee && payload.assignee !== "Unassigned") {
        const onLeaveSet = await getOnLeaveIdentifiers();
        const isAssigneeOnLeave = (payload.assigneeUid && onLeaveSet.has(payload.assigneeUid.toLowerCase())) ||
            onLeaveSet.has(payload.assignee.toLowerCase());
        if (isAssigneeOnLeave) {
            throw new Error(`Cannot assign task to ${payload.assignee} because they are currently on leave.`);
        }
    }
    const docData = {
        ...payload,
        createdBy: currentUserId || "anonymous",
        createdByName: currentUserName || "Staff Member",
        createdAt: (0, firestore_1.serverTimestamp)(),
    };
    // Remove undefined properties to prevent Firestore addDoc errors
    Object.keys(docData).forEach((key) => {
        if (docData[key] === undefined) {
            delete docData[key];
        }
    });
    return await (0, firestore_1.addDoc)((0, firestore_1.collection)(db, "staffTasks"), docData);
}
async function updateStaffTask(taskId, updates) {
    const db = (0, firebase_instance_1.getDb)();
    if (updates.assignee && updates.assignee !== "Unassigned") {
        const onLeaveSet = await getOnLeaveIdentifiers();
        const isAssigneeOnLeave = (updates.assigneeUid && onLeaveSet.has(updates.assigneeUid.toLowerCase())) ||
            onLeaveSet.has(updates.assignee.toLowerCase());
        if (isAssigneeOnLeave) {
            throw new Error(`Cannot assign task to ${updates.assignee} because they are currently on leave.`);
        }
    }
    const safeUpdates = { ...updates };
    Object.keys(safeUpdates).forEach((key) => {
        if (safeUpdates[key] === undefined) {
            delete safeUpdates[key];
        }
    });
    return await (0, firestore_1.updateDoc)((0, firestore_1.doc)(db, "staffTasks", taskId), safeUpdates);
}
async function deleteStaffTask(taskId) {
    return await (0, firestore_1.deleteDoc)((0, firestore_1.doc)((0, firebase_instance_1.getDb)(), "staffTasks", taskId));
}
async function fetchStaffUserNames(departmentFilter) {
    try {
        const db = (0, firebase_instance_1.getDb)();
        const [snap, onLeaveSet] = await Promise.all([
            (0, firestore_1.getDocs)((0, firestore_1.query)((0, firestore_1.collection)(db, "users"))),
            getOnLeaveIdentifiers(),
        ]);
        const names = [];
        const getBaseDept = (dept) => {
            if (!dept)
                return "";
            const d = dept.toLowerCase();
            if (d.startsWith("content"))
                return "content";
            if (d.startsWith("operation"))
                return "operations";
            if (d.startsWith("dev"))
                return "developers";
            return d;
        };
        const filterBase = getBaseDept(departmentFilter);
        const filterLower = departmentFilter?.toLowerCase() || "";
        const isFilterAdmin = filterLower.includes("admin");
        snap.docs.forEach((d) => {
            const data = d.data();
            const userId = d.id.toLowerCase();
            const name = data.displayName || data.name || data.email?.split("@")[0];
            const email = (data.email || "").toLowerCase();
            // Filter out staff members currently on leave (via leaveRequests or users status)
            if (onLeaveSet.has(userId) ||
                (name && onLeaveSet.has(name.toLowerCase())) ||
                (email && onLeaveSet.has(email))) {
                return;
            }
            const userDeptLower = (data.department || "").toLowerCase();
            if (filterBase) {
                // If the assigner is an admin (e.g. content-admin), they should only see their staff (e.g. content-staff)
                if (isFilterAdmin) {
                    const expectedStaff = filterLower.replace("-admin", "-staff").replace(" admin", " staff");
                    if (userDeptLower !== expectedStaff && !userDeptLower.includes("staff")) {
                        return;
                    }
                    // Also ensure they are in the same base department
                    if (getBaseDept(data.department) !== filterBase)
                        return;
                }
                else {
                    // Normal base department check
                    if (getBaseDept(data.department) !== filterBase)
                        return;
                }
            }
            if (name && !names.includes(name))
                names.push(name);
        });
        return names;
    }
    catch (err) {
        console.error("[agunwami-backend] fetchStaffUserNames error:", err);
        return [];
    }
}
