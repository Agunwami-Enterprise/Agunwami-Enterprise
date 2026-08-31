"use strict";
// ─── User Types ───────────────────────────────────────────────────────────────
// Canonical user model — single source of truth for aehub-onboarding and agunwami-enterprise.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaffDisplayName = getStaffDisplayName;
exports.getStaffAvatar = getStaffAvatar;
exports.getStaffPhone = getStaffPhone;
exports.getStaffPosition = getStaffPosition;
exports.getStaffPermissions = getStaffPermissions;
// ─── Profile Field Helpers ───────────────────────────────────────────────────
/** Helper to extract canonical display name from a user profile or document */
function getStaffDisplayName(user) {
    if (!user)
        return 'Staff Member';
    const u = user;
    return (u.displayName || u.name || u.fullName || u.email?.split('@')[0] || 'Staff Member');
}
/** Helper to extract avatar photo URL */
function getStaffAvatar(user) {
    if (!user)
        return undefined;
    const u = user;
    return (u.photoURL || u.avatarUrl || undefined);
}
/** Helper to extract phone number */
function getStaffPhone(user) {
    if (!user)
        return undefined;
    const u = user;
    return (u.phone || u.phoneNumber || undefined);
}
/** Helper to extract staff job title / position */
function getStaffPosition(user) {
    if (!user)
        return 'Staff';
    const u = user;
    return (u.departmentPosition || u.position || 'Staff');
}
/** Helper to extract department permissions */
function getStaffPermissions(user) {
    if (!user)
        return [];
    const u = user;
    if (Array.isArray(u.departmentPermissions))
        return u.departmentPermissions;
    if (Array.isArray(u.staffPermissions))
        return u.staffPermissions;
    return [];
}
