"use strict";
// ─── agunwami-backend ─────────────────────────────────────────────────────────
// Single import surface for both aehub-onboarding and agunwami-enterprise.
//
// Usage:
//   import { UserProfile, clockIn, subscribeToday, DEFAULT_SHIFT_START } from 'agunwami-backend';
//
// Setup (once per app, in your Firebase init file or root layout):
//   import { initBackend } from 'agunwami-backend';
//   import { db } from '@/lib/firebase'; // your app's own firebase.ts
//   initBackend(db);
// ─────────────────────────────────────────────────────────────────────────────
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
exports.subscribeStaff = exports.subscribePayments = exports.routeForNotif = exports.markAllNotifsRead = exports.markNotifRead = exports.subscribeNotifications = exports.fetchStaffUserNames = exports.deleteStaffTask = exports.updateStaffTask = exports.createStaffTask = exports.subscribeStaffTasks = exports.subscribeTasks = exports.subscribeLeaveRequests = exports.monthId = exports.todayId = exports.computeLiveTotals = exports.getDay = exports.subscribeLiveTeam = exports.subscribeMonthlySummary = exports.subscribeToday = exports.resumeWork = exports.startBreak = exports.clockOut = exports.clockIn = exports.subscribeUserProfile = exports.getDb = exports.initBackend = void 0;
// ── Constants ─────────────────────────────────────────────────────────────────
__exportStar(require("./constants/shift"), exports);
// ── Types & Helpers ───────────────────────────────────────────────────────────
__exportStar(require("./types/user"), exports);
// ── Utils ─────────────────────────────────────────────────────────────────────
__exportStar(require("./utils/time"), exports);
__exportStar(require("./utils/shift"), exports);
// ── Services ─────────────────────────────────────────────────────────────────
var firebase_instance_1 = require("./services/firebase-instance");
Object.defineProperty(exports, "initBackend", { enumerable: true, get: function () { return firebase_instance_1.initBackend; } });
Object.defineProperty(exports, "getDb", { enumerable: true, get: function () { return firebase_instance_1.getDb; } });
var user_profile_1 = require("./services/user-profile");
Object.defineProperty(exports, "subscribeUserProfile", { enumerable: true, get: function () { return user_profile_1.subscribeUserProfile; } });
var time_tracking_1 = require("./services/time-tracking");
Object.defineProperty(exports, "clockIn", { enumerable: true, get: function () { return time_tracking_1.clockIn; } });
Object.defineProperty(exports, "clockOut", { enumerable: true, get: function () { return time_tracking_1.clockOut; } });
Object.defineProperty(exports, "startBreak", { enumerable: true, get: function () { return time_tracking_1.startBreak; } });
Object.defineProperty(exports, "resumeWork", { enumerable: true, get: function () { return time_tracking_1.resumeWork; } });
Object.defineProperty(exports, "subscribeToday", { enumerable: true, get: function () { return time_tracking_1.subscribeToday; } });
Object.defineProperty(exports, "subscribeMonthlySummary", { enumerable: true, get: function () { return time_tracking_1.subscribeMonthlySummary; } });
Object.defineProperty(exports, "subscribeLiveTeam", { enumerable: true, get: function () { return time_tracking_1.subscribeLiveTeam; } });
Object.defineProperty(exports, "getDay", { enumerable: true, get: function () { return time_tracking_1.getDay; } });
Object.defineProperty(exports, "computeLiveTotals", { enumerable: true, get: function () { return time_tracking_1.computeLiveTotals; } });
Object.defineProperty(exports, "todayId", { enumerable: true, get: function () { return time_tracking_1.todayId; } });
Object.defineProperty(exports, "monthId", { enumerable: true, get: function () { return time_tracking_1.monthId; } });
var leave_1 = require("./services/leave");
Object.defineProperty(exports, "subscribeLeaveRequests", { enumerable: true, get: function () { return leave_1.subscribeLeaveRequests; } });
var tasks_1 = require("./services/tasks");
Object.defineProperty(exports, "subscribeTasks", { enumerable: true, get: function () { return tasks_1.subscribeTasks; } });
Object.defineProperty(exports, "subscribeStaffTasks", { enumerable: true, get: function () { return tasks_1.subscribeStaffTasks; } });
Object.defineProperty(exports, "createStaffTask", { enumerable: true, get: function () { return tasks_1.createStaffTask; } });
Object.defineProperty(exports, "updateStaffTask", { enumerable: true, get: function () { return tasks_1.updateStaffTask; } });
Object.defineProperty(exports, "deleteStaffTask", { enumerable: true, get: function () { return tasks_1.deleteStaffTask; } });
Object.defineProperty(exports, "fetchStaffUserNames", { enumerable: true, get: function () { return tasks_1.fetchStaffUserNames; } });
var notifications_1 = require("./services/notifications");
Object.defineProperty(exports, "subscribeNotifications", { enumerable: true, get: function () { return notifications_1.subscribeNotifications; } });
Object.defineProperty(exports, "markNotifRead", { enumerable: true, get: function () { return notifications_1.markNotifRead; } });
Object.defineProperty(exports, "markAllNotifsRead", { enumerable: true, get: function () { return notifications_1.markAllNotifsRead; } });
Object.defineProperty(exports, "routeForNotif", { enumerable: true, get: function () { return notifications_1.routeForNotif; } });
var payments_1 = require("./services/payments");
Object.defineProperty(exports, "subscribePayments", { enumerable: true, get: function () { return payments_1.subscribePayments; } });
var staff_1 = require("./services/staff");
Object.defineProperty(exports, "subscribeStaff", { enumerable: true, get: function () { return staff_1.subscribeStaff; } });
