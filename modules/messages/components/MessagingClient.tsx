"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  ref, query as rtdbQuery, orderByChild, equalTo,
  onValue, off, push, update, remove, get,
} from "firebase/database";
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, arrayUnion, deleteField, onSnapshot,
  serverTimestamp as fsTimestamp,
} from "firebase/firestore";
import dynamic from "next/dynamic";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { rtdb, db, storage } from "@/lib/workstation/firebase";
import { useAuth } from "@/lib/workstation/auth-context";
import {
  storeLocalSticker,
  getLocalSticker,
  getAllLocalStickers,
  compressStickerImage,
  deleteLocalSticker,
} from "@/lib/workstation/stickerEngine";
import {
  Search, Plus, Send, MessageSquare, Users, ChevronLeft, ChevronRight,
  Loader2, X, Check, CheckCheck, MoreVertical, Phone, Video,
  Smile, Paperclip, Calendar, Zap, Hash, Trash2, Shield, Clock,
  LogOut, Settings, UserPlus, ClipboardList, Edit3, Crown,
  Camera, Upload, Sticker, Image as ImageIcon, FileText, AtSign, AlertTriangle, AlertCircle, Bookmark, Reply,
} from "lucide-react";
import { toast } from "react-toastify";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
const LiveKitMeetingModal = dynamic(() => import("./LiveKitMeetingModal"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  name?: string;
  type?: "direct" | "group" | "community";
  memberIds: Record<string, boolean>;
  adminIds?: Record<string, boolean>;
  createdById?: string;
  description?: string;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageAt?: number;
  unreadCount?: Record<string, number>;
  createdAt?: number;
  avatarColor?: string;
  initials?: string;
  photoURL?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderAvatarColor: string;
  senderPhotoURL?: string;
  text: string;
  mediaUrl?: string;
  fileName?: string;
  fileType?: string;
  stickerId?: string;
  sentAt?: number;
  readBy?: Record<string, boolean>;
  type?: "text" | "sticker" | "image" | "file";
  deleted?: boolean;
  deletedBy?: string;
  deletedByRole?: "self" | "admin";
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    type?: string;
  };
}

interface StaffMember {
  id: string;
  displayName?: string | null;
  email?: string | null;
  role?: string;
  department?: string | null;
  photoURL?: string | null;
}

// ─── Invite Helper Notifications ──────────────────────────────────────────────

async function sendDMInviteNotification(
  myUid: string,
  myName: string,
  targetUid: string,
  targetName: string,
  activityTitle: string,
  activityDate: string,
  activityTime?: string,
  category?: string
) {
  let convId: string | null = null;
  const snap = await get(ref(rtdb, "conversations"));
  if (snap.exists()) {
    const convos = snap.val() as Record<string, any>;
    for (const [id, c] of Object.entries(convos)) {
      if (c.type === "direct" && c.memberIds?.[myUid] && c.memberIds?.[targetUid] && Object.keys(c.memberIds).length === 2) {
        convId = id;
        break;
      }
    }
  }

  const now = Date.now();
  const catLabel = category === "event" ? "Event" : "Meeting";
  if (!convId) {
    const convRef = push(ref(rtdb, "conversations"));
    convId = convRef.key!;
    await update(ref(rtdb, `conversations/${convId}`), {
      type: "direct",
      name: targetName,
      memberIds: { [myUid]: true, [targetUid]: true },
      adminIds: { [myUid]: true },
      lastMessage: `📅 ${catLabel} Invite: ${activityTitle}`,
      lastMessageSenderId: myUid,
      lastMessageSenderName: myName,
      lastMessageAt: now,
      unreadCount: { [myUid]: 0, [targetUid]: 1 },
      createdAt: now,
      avatarColor: colorFromStr(targetName),
      initials: getInitials(targetName),
    });
  }

  const timeStr = activityTime ? `\n⏰ Time: ${activityTime}` : "";
  const text = `📅 **${catLabel} Invitation**\n\nYou have been invited to: **${activityTitle}**\n📆 Date: ${friendlyDate(activityDate)}${timeStr}\n👤 Host: ${myName}\n\nPlease RSVP Accept in your calendar or chat to confirm attendance.`;

  await push(ref(rtdb, `messages/${convId}`), {
    senderId: myUid,
    senderName: myName,
    senderInitials: getInitials(myName),
    senderAvatarColor: colorFromStr(myName),
    text,
    sentAt: now,
    readBy: { [myUid]: true },
    type: "text",
  });

  const convoSnap = await get(ref(rtdb, `conversations/${convId}`));
  const convo = convoSnap.val();
  await update(ref(rtdb), {
    [`conversations/${convId}/lastMessage`]: `📅 ${catLabel} Invite: ${activityTitle}`,
    [`conversations/${convId}/lastMessageSenderId`]: myUid,
    [`conversations/${convId}/lastMessageSenderName`]: myName,
    [`conversations/${convId}/lastMessageAt`]: now,
    [`conversations/${convId}/unreadCount/${targetUid}`]: ((convo?.unreadCount?.[targetUid] || 0) + 1),
  });
}

async function sendConvoInviteNotification(
  myUid: string,
  myName: string,
  convId: string,
  activityTitle: string,
  activityDate: string,
  activityTime?: string,
  category?: string
) {
  const now = Date.now();
  const catLabel = category === "event" ? "Event" : "Meeting";
  const timeStr = activityTime ? `\n⏰ Time: ${activityTime}` : "";
  const shareText = `📅 **New ${catLabel}**: ${activityTitle}\n📆 Date: ${friendlyDate(activityDate)}${timeStr}\n👤 Host: ${myName}`;

  await push(ref(rtdb, `messages/${convId}`), {
    senderId: myUid,
    senderName: myName,
    senderInitials: getInitials(myName),
    senderAvatarColor: colorFromStr(myName),
    text: shareText,
    sentAt: now,
    readBy: { [myUid]: true },
    type: "text",
  });

  const convoSnap = await get(ref(rtdb, `conversations/${convId}`));
  const convo = convoSnap.val();
  const batch: Record<string, any> = {
    [`conversations/${convId}/lastMessage`]: `📅 ${catLabel}: ${activityTitle}`,
    [`conversations/${convId}/lastMessageSenderId`]: myUid,
    [`conversations/${convId}/lastMessageSenderName`]: myName,
    [`conversations/${convId}/lastMessageAt`]: now,
  };
  Object.keys(convo?.memberIds || {}).forEach(uid => {
    if (uid !== myUid) {
      batch[`conversations/${convId}/unreadCount/${uid}`] = (convo?.unreadCount?.[uid] || 0) + 1;
    }
  });
  await update(ref(rtdb), batch);
}

async function sendDMRemovalNotification(
  myUid: string,
  myName: string,
  targetUid: string,
  targetName: string,
  activityTitle: string,
  category?: string
) {
  let convId: string | null = null;
  const snap = await get(ref(rtdb, "conversations"));
  if (snap.exists()) {
    const convos = snap.val() as Record<string, any>;
    for (const [id, c] of Object.entries(convos)) {
      if (c.type === "direct" && c.memberIds?.[myUid] && c.memberIds?.[targetUid] && Object.keys(c.memberIds).length === 2) {
        convId = id;
        break;
      }
    }
  }

  const now = Date.now();
  const catLabel = category === "event" ? "Event" : "Meeting";
  if (!convId) {
    const convRef = push(ref(rtdb, "conversations"));
    convId = convRef.key!;
    await update(ref(rtdb, `conversations/${convId}`), {
      type: "direct",
      name: targetName,
      memberIds: { [myUid]: true, [targetUid]: true },
      adminIds: { [myUid]: true },
      lastMessage: `ℹ️ Removed from ${catLabel}: ${activityTitle}`,
      lastMessageSenderId: myUid,
      lastMessageSenderName: myName,
      lastMessageAt: now,
      unreadCount: { [myUid]: 0, [targetUid]: 1 },
      createdAt: now,
      avatarColor: colorFromStr(targetName),
      initials: getInitials(targetName),
    });
  }

  const text = `ℹ️ **${catLabel} Update**\n\nYou have been removed from the invitation list for: **${activityTitle}**.`;

  await push(ref(rtdb, `messages/${convId}`), {
    senderId: myUid,
    senderName: myName,
    senderInitials: getInitials(myName),
    senderAvatarColor: colorFromStr(myName),
    text,
    sentAt: now,
    readBy: { [myUid]: true },
    type: "text",
  });

  const convoSnap = await get(ref(rtdb, `conversations/${convId}`));
  const convo = convoSnap.val();
  await update(ref(rtdb), {
    [`conversations/${convId}/lastMessage`]: `ℹ️ Removed from ${catLabel}: ${activityTitle}`,
    [`conversations/${convId}/lastMessageSenderId`]: myUid,
    [`conversations/${convId}/lastMessageSenderName`]: myName,
    [`conversations/${convId}/lastMessageAt`]: now,
    [`conversations/${convId}/unreadCount/${targetUid}`]: ((convo?.unreadCount?.[targetUid] || 0) + 1),
  });
}

async function sendConvoRemovalNotification(
  myUid: string,
  myName: string,
  convId: string,
  activityTitle: string,
  category?: string
) {
  const now = Date.now();
  const catLabel = category === "event" ? "Event" : "Meeting";
  const shareText = `ℹ️ **${catLabel} Update**: This channel has been removed from the guest list for **${activityTitle}**.`;

  await push(ref(rtdb, `messages/${convId}`), {
    senderId: myUid,
    senderName: myName,
    senderInitials: getInitials(myName),
    senderAvatarColor: colorFromStr(myName),
    text: shareText,
    sentAt: now,
    readBy: { [myUid]: true },
    type: "text",
  });

  const convoSnap = await get(ref(rtdb, `conversations/${convId}`));
  const convo = convoSnap.val();
  const batch: Record<string, any> = {
    [`conversations/${convId}/lastMessage`]: `ℹ️ Removed from ${catLabel}: ${activityTitle}`,
    [`conversations/${convId}/lastMessageSenderId`]: myUid,
    [`conversations/${convId}/lastMessageSenderName`]: myName,
    [`conversations/${convId}/lastMessageAt`]: now,
  };
  Object.keys(convo?.memberIds || {}).forEach(uid => {
    if (uid !== myUid) {
      batch[`conversations/${convId}/unreadCount/${uid}`] = (convo?.unreadCount?.[uid] || 0) + 1;
    }
  });
  await update(ref(rtdb), batch);
}

// ─── Activity ─────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string;        // "YYYY-MM-DD"
  startTime?: string;  // "HH:MM"
  endTime?: string;    // "HH:MM"
  allDay?: boolean;
  category: "meeting" | "deadline" | "task" | "event" | "reminder" | "leave";
  createdBy: string;
  createdByName: string;
  createdAt: number;
  invitedUsers?: string[];
  invitedUserNames?: string[];
  invitedConvoIds?: string[];
  reminderTime?: string;
  isTask?: boolean;
  isLeave?: boolean;
  rsvps?: Record<string, "accepted" | "declined">;
}

const CATEGORY_CONFIG: Record<
  Activity["category"],
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  meeting:  { label: "Meeting",  dot: "bg-blue-500",    bg: "bg-blue-100",    text: "text-blue-800",    border: "border-blue-200"   },
  deadline: { label: "Deadline", dot: "bg-rose-500",    bg: "bg-rose-100",    text: "text-rose-800",    border: "border-rose-200"   },
  task:     { label: "Task",     dot: "bg-amber-500",   bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200"  },
  event:    { label: "Event",    dot: "bg-emerald-500", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  reminder: { label: "Reminder", dot: "bg-purple-500",  bg: "bg-purple-100",  text: "text-purple-800",  border: "border-purple-200"  },
  leave:    { label: "Leave",    dot: "bg-teal-500",    bg: "bg-teal-100",    text: "text-teal-800",    border: "border-teal-200"    },
};

const CREATABLE_CATEGORIES: Activity["category"][] = ["meeting", "deadline", "event", "reminder"];

const REMINDER_OPTIONS = [
  { id: "15m", label: "15 minutes before" },
  { id: "30m", label: "30 minutes before" },
  { id: "1h", label: "1 hour before" },
  { id: "1d", label: "1 day before" },
  { id: "at_time", label: "At time of event" },
  { id: "none", label: "No reminder" },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function dateToStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isEditableOrCancellable(dateStr: string): boolean {
  if (!dateStr) return false;
  const actDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = actDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 1;
}

function friendlyDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getEffectiveRSVPStatus(
  act: { date: string; startTime?: string | null; invitedUsers?: string[]; rsvps?: Record<string, "pending" | "accepted" | "declined" | "expired"> },
  uid: string
): "pending" | "accepted" | "declined" | "expired" | "not_invited" {
  if (act.invitedUsers && Array.isArray(act.invitedUsers) && !act.invitedUsers.includes(uid)) {
    return "not_invited";
  }

  const currentStatus = act.rsvps?.[uid];

  if (currentStatus === "accepted" || currentStatus === "declined") {
    return currentStatus;
  }

  const todayStr = dateToStr(new Date());
  let isPast = false;
  if (act.date < todayStr) {
    isPast = true;
  } else if (act.date === todayStr && act.startTime) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [h, m] = act.startTime.split(":").map(Number);
    const actMin = h * 60 + m;
    if (nowMin - actMin > 60) {
      isPast = true;
    }
  }

  if (isPast) {
    return "expired";
  }

  return currentStatus || "pending";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-purple-500","bg-teal-500","bg-indigo-500",
  "bg-rose-500","bg-blue-500","bg-amber-500","bg-emerald-500",
];

function colorFromStr(s?: string | null) {
  const str = s || "default";
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function formatTimestamp(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ms?: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 86_400_000) return formatTimestamp(ms);
  if (diff < 604_800_000) return new Date(ms).toLocaleDateString("en-US", { weekday: "short" });
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ initials, color, photoURL, size = "md", online }: {
  initials: string; color: string; photoURL?: string | null;
  size?: "xs" | "sm" | "md" | "lg"; online?: boolean;
}) {
  const sz = { xs: 24, sm: 32, md: 40, lg: 48 }[size];
  const cls = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" }[size];
  const dot = { xs: "w-1.5 h-1.5", sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3 h-3" }[size];
  return (
    <div className="relative shrink-0">
      <div className={`${cls} rounded-full overflow-hidden ${photoURL ? "" : `${color} text-white font-bold flex items-center justify-center select-none`}`}>
        {photoURL ? <Image src={photoURL} alt={initials} width={sz} height={sz} className="object-cover w-full h-full" unoptimized /> : initials}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dot} rounded-full border-2 border-white dark:border-zinc-900 ${online ? "bg-emerald-500" : "bg-gray-300"}`} />
      )}
    </div>
  );
}

// ─── Conversation type badge ────────────────────────────────────────────────────

function ConvTypeBadge({ type }: { type?: string }) {
  if (type === "group") return (
    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
      <Users className="w-2 h-2 text-white" />
    </span>
  );
  if (type === "community") return (
    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
      <Hash className="w-2 h-2 text-white" />
    </span>
  );
  return null;
}

// ─── Sticker Renderer with Favorite/Save Button ───────────────────────────────

function StickerImage({
  stickerId,
  mediaUrl,
  onSaveToFavorites,
  isSaved,
}: {
  stickerId?: string;
  mediaUrl?: string;
  onSaveToFavorites?: (mediaUrl: string) => void;
  isSaved?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(mediaUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    if (stickerId) {
      getLocalSticker(stickerId).then((blob) => {
        if (blob && isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        } else if (mediaUrl && isMounted) {
          setSrc(mediaUrl);
        }
      });
    } else if (mediaUrl) {
      setSrc(mediaUrl);
    }

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [stickerId, mediaUrl]);

  if (!src) return <div className="w-32 h-32 bg-gray-100 dark:bg-zinc-800 animate-pulse rounded-xl" />;

  return (
    <div className="relative group/sticker inline-block">
      <Image
        src={src}
        alt="Sticker"
        width={140}
        height={140}
        className="object-contain max-w-[160px] max-h-[160px] drop-shadow-md transition-transform hover:scale-105"
        unoptimized
      />
      {/* Save to Favorites Quick Button */}
      {mediaUrl && onSaveToFavorites && (
        <button
          onClick={async () => {
            if (isSaving || isSaved) return;
            if (!mediaUrl.startsWith("https://firebasestorage.googleapis.com/") && !mediaUrl.startsWith("blob:")) {
              toast.error("Invalid sticker media URL.");
              return;
            }
            setIsSaving(true);
            try {
              await onSaveToFavorites(mediaUrl);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaved || isSaving}
          title={isSaved ? "Saved to stickers" : "Add to favorites"}
          aria-label={isSaved ? "Saved to stickers" : "Add to favorites"}
          className={`absolute top-1 right-1 p-1.5 rounded-full shadow-md backdrop-blur-md transition-all ${
            isSaved
              ? "bg-amber-500 text-white opacity-100"
              : "bg-black/60 hover:bg-amber-500 text-white opacity-0 group-hover/sticker:opacity-100"
          }`}
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />}
        </button>
      )}
    </div>
  );
}

// ─── Formatted Message Text with Tag Highlighting & Read More Truncation ──────

function FormattedMessageText({
  text,
  isMe,
  validMemberNames = [],
}: {
  text: string;
  isMe: boolean;
  validMemberNames?: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_TRUNCATE_LIMIT = 500;
  const isLongMessage = text.length > CHAR_TRUNCATE_LIMIT;

  const displayText = isLongMessage && !isExpanded
    ? text.slice(0, CHAR_TRUNCATE_LIMIT) + "..."
    : text;

  // Normalize valid member names (case-insensitive)
  const normalizedValidNames = new Set(
    validMemberNames.map((n) => n.toLowerCase().trim())
  );

  // Regex to match @all, @everyone, or @words
  const tagRegex = /(@all|@everyone|@[A-Za-z0-9_\-\.]+)/gi;
  const parts = displayText.split(tagRegex);

  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      <span>
        {parts.map((part, index) => {
          if (!part) return null;
          const lowerPart = part.toLowerCase();

          // 1. Check if it's @all / @everyone
          if (lowerPart === "@all" || lowerPart === "@everyone") {
            return (
              <span
                key={index}
                className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-xs shadow-xs border ${
                  isMe
                    ? "bg-amber-600 text-yellow-200 border-amber-400/40"
                    : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50"
                }`}
              >
                📢 {part}
              </span>
            );
          }

          // 2. Check if @Username matches an actual member in the group
          if (part.startsWith("@")) {
            const rawName = part.slice(1).toLowerCase().trim();
            const isValidMember =
              normalizedValidNames.has(rawName) ||
              Array.from(normalizedValidNames).some(
                (name) => name.startsWith(rawName) || name.includes(rawName)
              );

            if (isValidMember) {
              return (
                <span
                  key={index}
                  className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-xs border ${
                    isMe
                      ? "bg-amber-600 text-white border-amber-300/40"
                      : "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/50"
                  }`}
                >
                  {part}
                </span>
              );
            }
          }

          // 3. Fallback: Print as normal text
          return <span key={index}>{part}</span>;
        })}
      </span>

      {/* Truncation / Expansion Toggle */}
      {isLongMessage && (
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`block text-[11px] font-bold mt-1 underline transition-colors ${
            isMe ? "text-amber-100 hover:text-white" : "text-amber-600 dark:text-amber-400 hover:underline"
          }`}
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
}

// ─── Date separator ────────────────────────────────────────────────────────────

function DateSeparator({ ms }: { ms: number }) {
  const d = new Date(ms), now = new Date();
  let label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (d.toDateString() === now.toDateString()) label = "Today";
  else { const y = new Date(now); y.setDate(y.getDate() - 1); if (d.toDateString() === y.toDateString()) label = "Yesterday"; }
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2">{label}</span>
      <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
    </div>
  );
}

// ─── Assign Task Modal (Communities) ───────────────────────────────────────────

function AssignTaskModal({ isOpen, onClose, convo, myUid, myName }: {
  isOpen: boolean; onClose: () => void;
  convo: Conversation | null; myUid: string; myName: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High"|"Medium"|"Low">("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !convo) return;
    (async () => {
      const uids = Object.keys(convo.memberIds || {}).filter(u => u !== myUid);
      const fetched: StaffMember[] = [];
      for (const uid of uids) {
        try {
          const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
          snap.forEach(d => fetched.push({ id: d.id, ...d.data() } as StaffMember));
        } catch {}
      }
      setMembers(fetched);
    })();
  }, [isOpen, convo, myUid]);

  const handleAssign = async () => {
    if (!title.trim() || !assigneeId) return;
    setSaving(true);
    try {
      const assignee = members.find(m => m.id === assigneeId);
      await addDoc(collection(db, "tasks"), {
        task: title.trim(),
        title: title.trim(),
        description: description.trim(),
        assignee: assignee?.displayName || assignee?.email || assigneeId,
        assignees: [{ id: assigneeId, name: assignee?.displayName || assignee?.email || assigneeId }],
        dueDate: dueDate || "",
        priority,
        status: "Pending",
        createdById: myUid,
        createdByName: myName,
        sourceType: "community",
        sourceConvId: convo?.id,
        createdAt: fsTimestamp(),
      });
      toast.success("Task assigned!");
      onClose(); setTitle(""); setDescription(""); setDueDate(""); setAssigneeId("");
    } catch { toast.error("Failed to assign task."); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="assign-task-modal-title" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-500" />
            <h2 id="assign-task-modal-title" className="text-base font-bold text-gray-900 dark:text-white">Assign Task</h2>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Task Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Review Q3 report"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Assignee *</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white">
              <option value="">Select member...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.displayName || m.email}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional details..."
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white resize-none" />
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={handleAssign} disabled={!title.trim() || !assigneeId || saving}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            {saving ? "Assigning..." : "Assign Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group / Community Settings Modal ──────────────────────────────────────────

function GroupSettingsModal({ isOpen, onClose, convo, myUid, myName, myDept }: {
  isOpen: boolean; onClose: () => void;
  convo: Conversation | null; myUid: string; myName: string; myDept?: string | null;
}) {
  const [tab, setTab] = useState<"info"|"members"|"add">("info");
  const [name, setName] = useState(convo?.name || "");
  const [description, setDescription] = useState(convo?.description || "");
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchAdd, setSearchAdd] = useState("");
  const [selectedAdd, setSelectedAdd] = useState<StaffMember[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  const [memberProfiles, setMemberProfiles] = useState<Record<string, StaffMember>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const userDept = (myDept || "").toLowerCase();
  const isDeptAdmin = ["ceo", "hr", "operation", "operations", "opm"].includes(userDept);
  const isAdmin = isDeptAdmin || !!(convo?.adminIds?.[myUid]);
  const isOwner = isDeptAdmin || convo?.createdById === myUid || convo?.adminIds?.[myUid];
  const memberUids = Object.keys(convo?.memberIds || {});

  useEffect(() => {
    if (!isOpen || !convo) return;
    setName(convo?.name || "");
    setDescription(convo?.description || "");
    setTab("info");
    setSelectedAdd([]);
  }, [isOpen, convo]);

  const uidsKey = Object.keys(convo?.memberIds || {}).sort().join(",");

  useEffect(() => {
    if (!isOpen || tab !== "members" || !convo) return;

    const uids = Object.keys(convo.memberIds || {});
    // If all profiles for current uids are already in state, skip refetching
    const missingUids = uids.filter(uid => !memberProfiles[uid]);
    if (missingUids.length === 0 && Object.keys(memberProfiles).length > 0) {
      return;
    }

    (async () => {
      setLoadingMembers(true);
      const profiles: Record<string, StaffMember> = { ...memberProfiles };
      
      for (const uid of uids) {
        if (profiles[uid]) continue; // Skip already cached profile
        try {
          const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
          snap.forEach(d => {
            profiles[uid] = { id: d.id, ...d.data() } as StaffMember;
          });
        } catch (e) {
          console.error("Error loading profile for", uid, e);
        }
      }
      setMemberProfiles(profiles);
      setLoadingMembers(false);
    })();
  }, [isOpen, tab, convo?.id, uidsKey]);

  useEffect(() => {
    if (tab !== "add") return;
    (async () => {
      const userDept = (myDept || "").toLowerCase();
      const canManageStudents = ["ceo", "hr", "operation", "operations", "opm"].includes(userDept);
      const rolesToFetch = canManageStudents ? ["staff", "student"] : ["staff"];

      const snap = await getDocs(query(collection(db, "users"), where("role", "in", rolesToFetch)));
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember))
        .filter(u => u.id !== myUid && !convo?.memberIds?.[u.id]));
    })();
  }, [tab, convo, myUid, myDept]);

  const [photoURL, setPhotoURL] = useState(convo?.photoURL || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !convo) return;
    setName(convo?.name || "");
    setDescription(convo?.description || "");
    setPhotoURL(convo?.photoURL || "");
    setTab("info");
    setSelectedAdd([]);
  }, [isOpen, convo]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !convo || !isAdmin) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileRef = storageRef(storage, `group-photos/${convo.id}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);
      setPhotoURL(downloadURL);

      await update(ref(rtdb, `conversations/${convo.id}`), { photoURL: downloadURL });
      toast.success("Group profile picture updated!");
    } catch (err) {
      console.error("Photo upload error:", err);
      toast.error("Failed to upload group profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveInfo = async () => {
    if (!convo || !name.trim()) return;
    setSaving(true);
    try {
      await update(ref(rtdb, `conversations/${convo.id}`), {
        name: name.trim(),
        description: description.trim(),
        initials: getInitials(name.trim()),
        photoURL: photoURL || null,
      });
      toast.success("Updated!");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const promoteAdmin = async (uid: string) => {
    if (!convo || !isAdmin) return;
    await update(ref(rtdb, `conversations/${convo.id}/adminIds`), { [uid]: true });
    toast.success("Promoted to admin.");
  };

  const demoteAdmin = async (uid: string) => {
    if (!convo || !isAdmin || uid === myUid) return;
    await remove(ref(rtdb, `conversations/${convo.id}/adminIds/${uid}`));
    toast.success("Admin removed.");
  };

  const removeMember = async (uid: string) => {
    if (!convo || !isAdmin) return;
    const updates: Record<string, any> = {};
    updates[`conversations/${convo.id}/memberIds/${uid}`] = null;
    updates[`conversations/${convo.id}/adminIds/${uid}`] = null;
    updates[`conversations/${convo.id}/unreadCount/${uid}`] = null;
    await update(ref(rtdb), updates);
    toast.success("Member removed.");
  };

  const leaveGroup = async () => {
    if (!convo) return;
    await update(ref(rtdb), {
      [`conversations/${convo.id}/memberIds/${myUid}`]: null,
      [`conversations/${convo.id}/adminIds/${myUid}`]: null,
    });
    toast.success("Left the group.");
    onClose();
  };

  const addMembers = async () => {
    if (!convo || !selectedAdd.length) return;
    setAddingMembers(true);
    const updates: Record<string, any> = {};
    selectedAdd.forEach(u => {
      updates[`conversations/${convo.id}/memberIds/${u.id}`] = true;
      updates[`conversations/${convo.id}/unreadCount/${u.id}`] = 0;
    });
    await update(ref(rtdb), updates);
    toast.success(`${selectedAdd.length} member(s) added.`);
    setSelectedAdd([]); setTab("members"); setAddingMembers(false);
  };

  const filteredAdd = staffList.filter(u =>
    (u.displayName || u.email || "").toLowerCase().includes(searchAdd.toLowerCase())
  );

  if (!isOpen || !convo) return null;
  const typeColor = convo.type === "community" ? "emerald" : "blue";
  const TypeIcon = convo.type === "community" ? Hash : Users;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="group-settings-modal-title" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-${typeColor}-100 dark:bg-${typeColor}-950/40 flex items-center justify-center`}>
              <TypeIcon className={`w-4 h-4 text-${typeColor}-600 dark:text-${typeColor}-400`} />
            </div>
            <div>
              <h2 id="group-settings-modal-title" className="text-sm font-bold text-gray-900 dark:text-white">{convo.name}</h2>
              <p className="text-xs text-gray-400 capitalize">{convo.type} · {memberUids.length} members</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex border-b border-gray-100 dark:border-zinc-800 shrink-0">
          {(["info","members","add"] as const).map(t => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all rounded-none ${tab === t ? "text-amber-600 border-b-2 border-amber-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}>
              {t === "add" ? "Add Members" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* Info tab */}
          {tab === "info" && (
            <div className="p-5 space-y-4">
              {/* Group profile picture */}
              <div className="flex flex-col items-center justify-center space-y-2 pb-2">
                <div className="relative group">
                  <Avatar initials={getInitials(name)} color={colorFromStr(name)} photoURL={photoURL} size="lg" />
                  {isAdmin && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      {uploadingPhoto ? "Uploading..." : "Change Picture"}
                    </button>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                  {convo.type === "community" ? "Community" : "Group"} Name
                </label>
                <input value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white disabled:opacity-60" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} disabled={!isAdmin}
                  placeholder="What is this group about?"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white resize-none disabled:opacity-60" />
              </div>
              {isAdmin && (
                <button onClick={saveInfo} disabled={saving}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                <button onClick={leaveGroup}
                  className="w-full py-2.5 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-sm rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> Leave {convo.type === "community" ? "Community" : "Group"}
                </button>

                {isOwner && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete {convo.type === "community" ? "Community" : "Group"}
                  </button>
                )}
              </div>

              {/* Multi-step Safety Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
                    <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Delete {convo.type === "community" ? "Community" : "Group"}?</h3>
                        <p className="text-xs text-rose-500 font-medium">This action cannot be undone.</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      To confirm permanent deletion of all chat records and metadata, please type <span className="font-bold text-gray-900 dark:text-white select-all">"{convo.name || "Group"}"</span> below:
                    </p>

                    <input
                      type="text"
                      placeholder={`Type "${convo.name || "Group"}"`}
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-gray-900 dark:text-white"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(""); }}
                        className="flex-1 py-2 text-xs font-semibold border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={deleteConfirmName.trim() !== (convo.name || "Group").trim() || isDeletingGroup}
                        onClick={async () => {
                          const targetName = (convo.name || "Group").trim();
                          if (deleteConfirmName.trim() !== targetName) return;
                          setIsDeletingGroup(true);
                          try {
                            await remove(ref(rtdb, `conversations/${convo.id}`));
                            await remove(ref(rtdb, `messages/${convo.id}`));
                            toast.success(`${convo.type === "community" ? "Community" : "Group"} deleted.`);
                            setShowDeleteConfirm(false);
                            onClose();
                          } catch {
                            toast.error("Failed to delete group.");
                          } finally {
                            setIsDeletingGroup(false);
                          }
                        }}
                        className="flex-1 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        {isDeletingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Permanently"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members tab */}
          {tab === "members" && (
            <div className="py-2">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                </div>
              ) : (
                memberUids.map(uid => {
                  const profile = memberProfiles[uid];
                  const displayName = profile?.displayName || profile?.email || (uid === myUid ? "You" : uid.slice(0, 8) + "...");
                  const isUidAdmin = !!(convo.adminIds?.[uid]);
                  const isSelf = uid === myUid;
                  return (
                    <div key={uid} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <Avatar initials={getInitials(displayName)} color={colorFromStr(displayName)} photoURL={profile?.photoURL} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName} {isSelf && "(You)"}</p>
                          {isUidAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {isUidAdmin ? "Admin" : "Member"}
                          {profile?.department ? ` • ${profile.department}` : profile?.role ? ` • ${profile.role}` : ""}
                        </p>
                      </div>
                      {isAdmin && !isSelf && (
                        <div className="flex items-center gap-1">
                          {isUidAdmin ? (
                            <button onClick={() => demoteAdmin(uid)} title="Dismiss as admin" className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                              <Shield className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => promoteAdmin(uid)} title="Make group admin" className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                              <Crown className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => removeMember(uid)} title="Remove user from group" className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Add members tab */}
          {tab === "add" && (
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search staff..." value={searchAdd} onChange={e => setSearchAdd(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white" />
              </div>
              {selectedAdd.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAdd.map(u => (
                    <span key={u.id} className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-1 text-xs text-amber-800 dark:text-amber-300 font-medium">
                      {(u.displayName || u.email || "").split(" ")[0]}
                      <button onClick={() => setSelectedAdd(p => p.filter(x => x.id !== u.id))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {filteredAdd.map(u => {
                  const isSel = !!selectedAdd.find(x => x.id === u.id);
                  const name = u.displayName || u.email || "Staff";
                  return (
                    <button key={u.id} onClick={() => setSelectedAdd(p => isSel ? p.filter(x => x.id !== u.id) : [...p, u])}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSel ? "bg-amber-50 dark:bg-amber-950/30" : "hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
                      <Avatar initials={getInitials(name)} color={colorFromStr(name)} photoURL={u.photoURL} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                        <p className="text-xs text-gray-400">{u.department || u.role}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSel ? "bg-amber-500 border-amber-500" : "border-gray-300 dark:border-zinc-600"}`}>
                        {isSel && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
                {filteredAdd.length === 0 && <p className="text-center text-xs text-gray-400 py-6">No staff to add</p>}
              </div>
              <button onClick={addMembers} disabled={!selectedAdd.length || addingMembers}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                {addingMembers ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {addingMembers ? "Adding..." : `Add ${selectedAdd.length > 0 ? `(${selectedAdd.length})` : "Members"}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Chat Modal ─────────────────────────────────────────────────────────────

function NewChatModal({ isOpen, onClose, myUid, myName, myDept, onCreated }: {
  isOpen: boolean; onClose: () => void; myUid: string;
  myName: string; myDept?: string | null; onCreated: (convId: string) => void;
}) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StaffMember[]>([]);
  const [groupName, setGroupName] = useState("");
  const [convType, setConvType] = useState<"direct"|"group"|"community">("direct");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const userDept = (myDept || "").toLowerCase();
      const canManageStudents = ["ceo", "hr", "operation", "operations", "opm"].includes(userDept);
      const rolesToFetch = canManageStudents ? ["staff", "student"] : ["staff"];

      const snap = await getDocs(query(collection(db, "users"), where("role", "in", rolesToFetch)));
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)).filter(u => u.id !== myUid));
    })();
  }, [isOpen, myUid, myDept]);

  const filtered = staffList.filter(u => (u.displayName || u.email || "").toLowerCase().includes(search.toLowerCase()));
  const toggle = (u: StaffMember) => setSelected(p => p.find(x => x.id === u.id) ? p.filter(x => x.id !== u.id) : [...p, u]);

  const findExistingDirect = async (otherUid: string) => {
    const snap = await get(ref(rtdb, "conversations"));
    if (!snap.exists()) return null;
    for (const [id, c] of Object.entries(snap.val() as Record<string, any>))
      if (c.type === "direct" && c.memberIds?.[myUid] && c.memberIds?.[otherUid] && Object.keys(c.memberIds).length === 2) return id;
    return null;
  };

  const handleCreate = async () => {
    if (!selected.length) return;
    setIsCreating(true);
    try {
      const isGroup = selected.length > 1 || convType !== "direct";
      if (!isGroup) {
        const existing = await findExistingDirect(selected[0].id);
        if (existing) { onCreated(existing); onClose(); return; }
      }
      const type = selected.length === 1 ? convType : "group";
      const name = isGroup
        ? groupName || selected.map(u => (u.displayName || u.email || "").split(" ")[0]).join(", ")
        : selected[0].displayName || selected[0].email || "Chat";
      const memberIds: Record<string, boolean> = { [myUid]: true };
      selected.forEach(u => memberIds[u.id] = true);
      const adminIds: Record<string, boolean> = { [myUid]: true };
      const unreadCount: Record<string, number> = {};
      Object.keys(memberIds).forEach(uid => unreadCount[uid] = 0);
      const now = Date.now();
      const convRef = push(ref(rtdb, "conversations"));
      const convId = convRef.key!;
      await update(ref(rtdb, `conversations/${convId}`), {
        type, name, memberIds, adminIds, lastMessage: "Conversation started",
        lastMessageSenderId: myUid, lastMessageSenderName: myName,
        lastMessageAt: now, unreadCount, createdAt: now,
        avatarColor: colorFromStr(name), initials: getInitials(name),
      });
      await push(ref(rtdb, `messages/${convId}`), {
        senderId: myUid, senderName: myName, senderInitials: getInitials(myName),
        senderAvatarColor: colorFromStr(myName), text: "👋 Hello!",
        sentAt: now, readBy: { [myUid]: true }, type: "text",
      });
      toast.success("Conversation started!");
      onCreated(convId); onClose(); setSearch(""); setSelected([]); setGroupName(""); setConvType("direct");
    } catch { toast.error("Failed to create conversation."); }
    finally { setIsCreating(false); }
  };

  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="new-chat-modal-title" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <h2 id="new-chat-modal-title" className="text-base font-bold text-gray-900 dark:text-white">New Conversation</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select team members to chat with</p>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Type selector */}
        <div className="px-4 pt-4 flex gap-2">
          {(["direct","group","community"] as const).map(t => (
            <button key={t} onClick={() => setConvType(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all capitalize ${convType === t ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-amber-300"}`}>
              {t === "direct" ? "Direct" : t === "group" ? "Group" : "Community"}
            </button>
          ))}
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-gray-900 dark:text-white transition-all" />
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2">
            {selected.map(u => (
              <span key={u.id} className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-1 text-xs text-amber-800 dark:text-amber-300 font-medium">
                {(u.displayName || u.email || "").split(" ")[0]}
                <button onClick={() => toggle(u)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {(selected.length > 1 || convType !== "direct") && (
          <div className="px-4 pt-2">
            <input type="text" placeholder={`${convType === "community" ? "Community" : "Group"} name (optional)`} value={groupName} onChange={e => setGroupName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-gray-900 dark:text-white" />
          </div>
        )}

        <div className="max-h-52 overflow-y-auto px-3 py-2 space-y-0.5">
          {filtered.length === 0 && <p className="text-center text-xs text-gray-400 py-6">No staff found</p>}
          {filtered.map(u => {
            const name = u.displayName || u.email || "Staff";
            const isSel = !!selected.find(x => x.id === u.id);
            return (
              <button key={u.id}
                onClick={async () => {
                  if (convType === "direct") {
                    setSelected([u]);
                    setIsCreating(true);
                    try {
                      const existing = await findExistingDirect(u.id);
                      if (existing) {
                        onCreated(existing);
                        onClose();
                        setSelected([]);
                        return;
                      }
                      const memberIds: Record<string, boolean> = { [myUid]: true, [u.id]: true };
                      const adminIds: Record<string, boolean> = { [myUid]: true };
                      const unreadCount: Record<string, number> = { [myUid]: 0, [u.id]: 0 };
                      const now = Date.now();
                      const convRef = push(ref(rtdb, "conversations"));
                      const convId = convRef.key!;
                      await update(ref(rtdb, `conversations/${convId}`), {
                        type: "direct", name, memberIds, adminIds, lastMessage: "Conversation started",
                        lastMessageSenderId: myUid, lastMessageSenderName: myName,
                        lastMessageAt: now, unreadCount, createdAt: now,
                        avatarColor: colorFromStr(name), initials: getInitials(name),
                      });
                      await push(ref(rtdb, `messages/${convId}`), {
                        senderId: myUid, senderName: myName, senderInitials: getInitials(myName),
                        senderAvatarColor: colorFromStr(myName), text: "👋 Hello!",
                        sentAt: now, readBy: { [myUid]: true }, type: "text",
                      });
                      toast.success("Conversation started!");
                      onCreated(convId);
                      onClose();
                      setSelected([]);
                    } catch {
                      toast.error("Failed to start direct message.");
                    } finally {
                      setIsCreating(false);
                    }
                  } else {
                    toggle(u);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSel ? "bg-amber-50 dark:bg-amber-950/30" : "hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
                <Avatar initials={getInitials(name)} color={colorFromStr(name)} photoURL={u.photoURL} size="sm" online />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.department || u.role || "Staff"}</p>
                </div>
                {convType !== "direct" && (
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSel ? "bg-amber-500 border-amber-500" : "border-gray-300 dark:border-zinc-600"}`}>
                    {isSel && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-4 border-t border-gray-100 dark:border-zinc-800">
          <button onClick={handleCreate} disabled={!selected.length || isCreating}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {isCreating ? "Starting..." : selected.length > 1 ? `Create ${convType === "community" ? "Community" : "Group"} (${selected.length})` : "Start Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Tab ────────────────────────────────────────────────────────────

function CalendarTab({ myUid, myName, memberProfiles, conversations, activities, loading, onRefresh, onSharePrompt, onJoinMeeting, joiningMeeting, onEditInvitees }: {
  myUid: string; myName: string;
  memberProfiles: Record<string, StaffMember>;
  conversations: Conversation[];
  activities: Activity[];
  loading?: boolean;
  onRefresh: () => void;
  onSharePrompt: (act: { id?: string; title: string; date: string; category: string; startTime?: string; description?: string; invitedConvoIds?: string[] }) => void;
  onJoinMeeting: (act: Activity) => void;
  joiningMeeting: boolean;
  onEditInvitees?: (act: Activity) => void;
}) {
  const today = dateToStr(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [invitedConvoIds, setInvitedConvoIds] = useState<string[]>([]);
  const [inviteTab, setInviteTab] = useState<"staff" | "group" | "community">("staff");
  const [form, setForm] = useState({
    title: "", description: "", startTime: "09:00", endTime: "10:00",
    allDay: false, category: "meeting" as Activity["category"],
    reminderTime: "15m",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync viewingActivity whenever activities prop changes (updates on edit, RSVP, invitee changes)
  useEffect(() => {
    if (viewingActivity) {
      const fresh = activities.find(a => a.id === viewingActivity.id);
      if (fresh) {
        setViewingActivity(fresh);
      } else {
        setViewingActivity(null);
        setShowPanel(false);
      }
    }
  }, [activities]);

  if (loading) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden animate-pulse bg-white dark:bg-zinc-900">
        {/* Left mini sidebar skeleton */}
        <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-950/20">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="w-5 h-5 rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-800 rounded" />
              <div className="w-5 h-5 rounded bg-gray-200 dark:bg-zinc-800" />
            </div>
            <div className="grid grid-cols-7 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                <span key={idx} className="text-center text-[9px] font-bold text-gray-300 dark:text-zinc-700">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-full bg-gray-100 dark:bg-zinc-800/60 flex items-center justify-center p-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-4 space-y-2">
            <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-800 rounded mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-2 bg-white dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-300 dark:bg-amber-700" />
                  <div className="h-3 w-28 bg-gray-200 dark:bg-zinc-700 rounded" />
                </div>
                <div className="h-2.5 w-16 bg-gray-100 dark:bg-zinc-800 rounded pl-3.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Right main calendar grid skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header navigation bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800" />
              <div className="h-5 w-36 bg-gray-200 dark:bg-zinc-800 rounded-lg mx-2" />
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800" />
              <div className="h-6 w-12 bg-amber-100/60 dark:bg-amber-950/40 rounded-lg ml-1" />
            </div>
            <div className="h-9 w-32 bg-amber-200/60 dark:bg-amber-950/50 rounded-xl" />
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/20">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 dark:text-gray-500">{d}</div>
            ))}
          </div>

          {/* 6x7 Month Grid Skeleton */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-100 dark:divide-zinc-800/60 overflow-hidden">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="p-1.5 flex flex-col justify-between bg-white dark:bg-zinc-900">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-zinc-800" />
                {i % 3 === 0 && (
                  <div className="h-4 w-full bg-amber-100/70 dark:bg-amber-950/40 rounded-md border border-amber-200/50 dark:border-amber-900/30" />
                )}
                {i % 5 === 1 && (
                  <div className="h-4 w-full bg-blue-100/70 dark:bg-blue-950/40 rounded-md border border-blue-200/50 dark:border-blue-900/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build 42-cell grid (6 rows × 7 cols)
  const cells = Array.from({ length: 42 }, (_, i) => {
    if (i < firstDow) {
      const d = daysInPrevMonth - firstDow + 1 + i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      return { date: `${py}-${String(pm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, cur: false };
    }
    const d = i - firstDow + 1;
    if (d <= daysInMonth) {
      return { date: `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, cur: true };
    }
    const nd = d - daysInMonth;
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    return { date: `${ny}-${String(nm+1).padStart(2,"0")}-${String(nd).padStart(2,"0")}`, day: nd, cur: false };
  });

  // Group activities by date
  const actsByDate = activities.reduce<Record<string, Activity[]>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {});

  const upcoming = activities
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const openCreate = (dateStr: string) => {
    if (dateStr < today) {
      const dayActs = actsByDate[dateStr] || [];
      if (dayActs.length > 0) {
        openView(dayActs[0]);
      } else {
        setShowPanel(false);
        setViewingActivity(null);
        toast.info("No activities occurred on this day.");
      }
      return;
    }
    setSelectedDay(dateStr);
    setViewingActivity(null);
    setEditingActivityId(null);
    setInvitedUserIds([]);
    setInvitedConvoIds([]);
    setForm({ title: "", description: "", startTime: "09:00", endTime: "10:00", allDay: false, category: "meeting", reminderTime: "15m" });
    setShowPanel(true);
  };

  const openView = (act: Activity) => {
    setSelectedDay(act.date);
    setViewingActivity(act);
    setEditingActivityId(null);
    setInvitedUserIds([]);
    setInvitedConvoIds([]);
    setShowPanel(true);
  };

  const startEdit = (act: Activity) => {
    if (!isEditableOrCancellable(act.date)) {
      toast.error("Activities can only be edited at least 1 day in advance.");
      return;
    }
    setEditingActivityId(act.id);
    setSelectedDay(act.date);
    setInvitedUserIds(act.invitedUsers || []);
    setInvitedConvoIds(act.invitedConvoIds || []);
    setForm({
      title: act.title,
      description: act.description || "",
      startTime: act.startTime || "09:00",
      endTime: act.endTime || "10:00",
      allDay: !!act.allDay,
      category: act.category,
      reminderTime: act.reminderTime || "15m",
    });
    setViewingActivity(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !selectedDay) return;

    const isMeetingOrEvent = form.category === "meeting" || form.category === "event";
    const finalInvitedUsers = isMeetingOrEvent ? invitedUserIds : [];
    const finalInvitedNames = isMeetingOrEvent
      ? invitedUserIds.map(uid => memberProfiles[uid]?.displayName || memberProfiles[uid]?.email || "Staff Member")
      : [];

    if (editingActivityId) {
      if (!isEditableOrCancellable(selectedDay)) {
        toast.error("Activities can only be edited at least 1 day in advance.");
        return;
      }
      const oldAct = activities.find(a => a.id === editingActivityId);
      const prevUsers = oldAct?.invitedUsers || [];
      const prevConvos = oldAct?.invitedConvoIds || [];

      setSaving(true);
      try {
        await updateDoc(doc(db, "activities", editingActivityId), {
          title: form.title.trim(),
          description: form.description.trim(),
          date: selectedDay,
          startTime: form.allDay ? null : form.startTime || null,
          endTime: form.allDay ? null : form.endTime || null,
          allDay: form.allDay,
          category: form.category,
          invitedUsers: finalInvitedUsers,
          invitedUserNames: finalInvitedNames,
          invitedConvoIds: isMeetingOrEvent ? invitedConvoIds : [],
          reminderTime: isMeetingOrEvent ? form.reminderTime : null,
          updatedAt: Date.now(),
        });

        // Send DM notifications to new invitees
        const newUsers = finalInvitedUsers.filter(id => !prevUsers.includes(id));
        for (const targetUid of newUsers) {
          if (targetUid !== myUid) {
            const name = memberProfiles[targetUid]?.displayName || memberProfiles[targetUid]?.email || "Staff Member";
            try {
              await sendDMInviteNotification(myUid, myName, targetUid, name, form.title.trim(), selectedDay, form.allDay ? undefined : form.startTime, form.category);
            } catch (e) { console.error("Error sending DM invite", e); }
          }
        }

        // Send DM notifications to removed invitees
        const removedUsers = prevUsers.filter(id => !finalInvitedUsers.includes(id));
        for (const targetUid of removedUsers) {
          if (targetUid !== myUid) {
            const name = memberProfiles[targetUid]?.displayName || memberProfiles[targetUid]?.email || "Staff Member";
            try {
              await sendDMRemovalNotification(myUid, myName, targetUid, name, form.title.trim(), form.category);
            } catch (e) { console.error("Error sending DM removal", e); }
          }
        }

        // Send group notifications to new groups/communities
        const newConvos = (isMeetingOrEvent ? invitedConvoIds : []).filter(id => !prevConvos.includes(id));
        for (const convId of newConvos) {
          try {
            await sendConvoInviteNotification(myUid, myName, convId, form.title.trim(), selectedDay, form.allDay ? undefined : form.startTime, form.category);
          } catch (e) { console.error("Error sending convo invite", e); }
        }

        // Send group notifications to removed groups/communities
        const removedConvos = prevConvos.filter(id => !(isMeetingOrEvent ? invitedConvoIds : []).includes(id));
        for (const convId of removedConvos) {
          try {
            await sendConvoRemovalNotification(myUid, myName, convId, form.title.trim(), form.category);
          } catch (e) { console.error("Error sending convo removal", e); }
        }

        toast.success("Activity updated!");
        setEditingActivityId(null);
        setShowPanel(false);
        onRefresh();
      } catch (e) {
        toast.error("Failed to update activity.");
      } finally {
        setSaving(false);
      }
    } else {
      if (selectedDay < today) {
        toast.error("Activities cannot be created for past dates.");
        return;
      }
      setSaving(true);
      try {
        const newDoc = await addDoc(collection(db, "activities"), {
          title: form.title.trim(),
          description: form.description.trim(),
          date: selectedDay,
          startTime: form.allDay ? null : form.startTime || null,
          endTime: form.allDay ? null : form.endTime || null,
          allDay: form.allDay,
          category: form.category,
          createdBy: myUid,
          createdByName: myName,
          invitedUsers: finalInvitedUsers,
          invitedUserNames: finalInvitedNames,
          invitedConvoIds: isMeetingOrEvent ? invitedConvoIds : [],
          reminderTime: isMeetingOrEvent ? form.reminderTime : null,
          createdAt: Date.now(),
        });

        // Send DM notifications to all invited users
        for (const targetUid of finalInvitedUsers) {
          if (targetUid !== myUid) {
            const name = memberProfiles[targetUid]?.displayName || memberProfiles[targetUid]?.email || "Staff Member";
            try {
              await sendDMInviteNotification(myUid, myName, targetUid, name, form.title.trim(), selectedDay, form.allDay ? undefined : form.startTime, form.category);
            } catch (e) { console.error("Error sending DM invite", e); }
          }
        }

        // Send group notifications to all invited groups
        for (const convId of (isMeetingOrEvent ? invitedConvoIds : [])) {
          try {
            await sendConvoInviteNotification(myUid, myName, convId, form.title.trim(), selectedDay, form.allDay ? undefined : form.startTime, form.category);
          } catch (e) { console.error("Error sending convo invite", e); }
        }

        toast.success("Activity created & invitations sent!");

        if (isMeetingOrEvent && finalInvitedUsers.length === 0 && invitedConvoIds.length === 0) {
          onSharePrompt({
            id: newDoc.id,
            title: form.title.trim(),
            date: selectedDay,
            category: form.category,
            startTime: form.allDay ? undefined : form.startTime,
            description: form.description.trim(),
            invitedConvoIds: invitedConvoIds,
          });
        }

        setForm({ title: "", description: "", startTime: "09:00", endTime: "10:00", allDay: false, category: "meeting", reminderTime: "15m" });
        setInvitedUserIds([]);
        setInvitedConvoIds([]);
        setShowPanel(false);
        onRefresh();
      } catch (e) { toast.error("Failed to create activity."); }
      finally { setSaving(false); }
    }
  };

  const handleCancelActivity = async (act: Activity) => {
    if (!isEditableOrCancellable(act.date)) {
      toast.error("Activities can only be cancelled at least 1 day in advance.");
      return;
    }
    if (!confirm(`Are you sure you want to cancel '${act.title}'?`)) return;
    setDeletingId(act.id);
    try {
      await deleteDoc(doc(db, "activities", act.id));

      // Send removal DMs to all invited users
      for (const targetUid of (act.invitedUsers || [])) {
        if (targetUid !== myUid) {
          const name = memberProfiles[targetUid]?.displayName || memberProfiles[targetUid]?.email || "Staff Member";
          try {
            await sendDMRemovalNotification(myUid, myName, targetUid, name, act.title, act.category);
          } catch (e) {}
        }
      }

      // Send removal messages to all invited groups
      for (const convId of (act.invitedConvoIds || [])) {
        try {
          await sendConvoRemovalNotification(myUid, myName, convId, act.title, act.category);
        } catch (e) {}
      }

      toast.success("Activity cancelled.");
      setViewingActivity(null);
      setShowPanel(false);
      onRefresh();
    } catch { toast.error("Failed to cancel activity."); }
    finally { setDeletingId(null); }
  };

  const prevM = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextM = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const selectedDayActs = selectedDay ? (actsByDate[selectedDay] || []) : [];

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Mini sidebar ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-gray-100 dark:border-zinc-800 overflow-y-auto bg-gray-50/40 dark:bg-zinc-950/20">

        {/* Mini month picker */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevM} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-extrabold text-gray-700 dark:text-gray-200">
              {MONTH_NAMES[month].slice(0,3)} {year}
            </span>
            <button onClick={nextM} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <span key={d} className="text-center text-[9px] font-bold text-gray-400 uppercase">{d[0]}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const hasActs = !!(actsByDate[cell.date]?.length);
              const isToday = cell.date === today;
              const isSel = cell.date === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => openCreate(cell.date)}
                  className={`relative flex items-center justify-center aspect-square rounded-full text-[10px] font-semibold transition-all ${
                    isSel   ? "bg-amber-500 text-white shadow-sm" :
                    isToday ? "bg-amber-100 text-amber-700" :
                    cell.cur ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800" :
                    "text-gray-300 dark:text-zinc-600"
                  }`}
                >
                  {cell.day}
                  {hasActs && !isSel && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="flex-1 p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">Upcoming</p>
          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No upcoming activities</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map(act => {
                const cfg = CATEGORY_CONFIG[act.category];
                return (
                  <button key={act.id} onClick={() => openView(act)}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{act.title}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 pl-3.5">
                      {new Date(act.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {act.startTime && !act.allDay ? ` · ${act.startTime}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main calendar grid ───────────────────────────── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${showPanel ? "hidden xl:flex" : "flex"}`}>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={prevM} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white w-44 text-center">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextM} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setViewDate(new Date()); openCreate(today); }}
              className="ml-1 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => {
              const targetDay = selectedDay && selectedDay >= today ? selectedDay : today;
              openCreate(targetDay);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            New Activity
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2.5 text-center text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-zinc-800" style={{ gridAutoRows: "minmax(88px, 1fr)" }}>
            {cells.map((cell, i) => {
              const dayActs = actsByDate[cell.date] || [];
              const isToday = cell.date === today;
              const isSel = cell.date === selectedDay && showPanel;
              return (
                <div
                  key={i}
                  onClick={() => openCreate(cell.date)}
                  className={`border-r border-b border-gray-100 dark:border-zinc-800 p-1.5 cursor-pointer transition-colors group ${
                    isToday ? "bg-amber-50/50 dark:bg-amber-950/10" :
                    isSel   ? "bg-amber-50/80 dark:bg-amber-950/20" :
                    "hover:bg-gray-50/70 dark:hover:bg-zinc-800/30"
                  } ${!cell.cur ? "opacity-40" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mb-1 mx-auto transition-all ${
                    isToday ? "bg-amber-500 text-white shadow-sm" :
                    isSel   ? "bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300" :
                    "text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700"
                  }`}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayActs.slice(0, 3).map(act => {
                      const cfg = CATEGORY_CONFIG[act.category];
                      return (
                        <div
                          key={act.id}
                          onClick={e => { e.stopPropagation(); openView(act); }}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold truncate cursor-pointer hover:opacity-80 transition-opacity ${cfg.bg} ${cfg.text}`}
                        >
                          {!act.allDay && act.startTime && <span className="opacity-60 mr-0.5">{act.startTime}</span>}
                          {act.title}
                        </div>
                      );
                    })}
                    {dayActs.length > 3 && (
                      <p className="text-[9px] text-gray-400 font-semibold pl-1">+{dayActs.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Create / View Activity Panel ─────────────────── */}
      {showPanel && (
        <div className="w-72 xl:w-80 shrink-0 border-l border-gray-100 dark:border-zinc-800 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 shadow-xl">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                {viewingActivity ? "Activity Details" : editingActivityId ? "Edit Activity" : "New Activity"}
              </p>
              {selectedDay && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate mt-0.5">
                  {friendlyDate(selectedDay)}
                </p>
              )}
            </div>
            <button
              onClick={() => { setShowPanel(false); setViewingActivity(null); setEditingActivityId(null); }}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {viewingActivity ? (
              /* ─ View mode ─ */
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${CATEGORY_CONFIG[viewingActivity.category].dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${CATEGORY_CONFIG[viewingActivity.category].bg} ${CATEGORY_CONFIG[viewingActivity.category].text}`}>
                      {CATEGORY_CONFIG[viewingActivity.category].label}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white break-words">{viewingActivity.title}</h3>
                  </div>
                </div>

                {/* Join LiveKit Video Meeting Button */}
                {(viewingActivity.category === "meeting" || viewingActivity.category === "event") && (
                  <button
                    onClick={() => onJoinMeeting(viewingActivity)}
                    disabled={joiningMeeting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {joiningMeeting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4 text-emerald-200 animate-pulse" />}
                    {joiningMeeting ? "Connecting to LiveKit Room..." : `Join Live Video ${viewingActivity.category === "meeting" ? "Meeting" : "Event"}`}
                  </button>
                )}

                {(viewingActivity.startTime || viewingActivity.allDay) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {viewingActivity.allDay
                      ? "All day"
                      : `${viewingActivity.startTime}${viewingActivity.endTime ? ` – ${viewingActivity.endTime}` : ""}`}
                  </div>
                )}

                {viewingActivity.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
                    {viewingActivity.description}
                  </p>
                )}

                <p className="text-[10px] text-gray-400">
                  By <span className="font-semibold text-gray-600 dark:text-gray-300">{viewingActivity.createdByName}</span>
                </p>

                {/* Sync Note for Task / Leave items vs Edit/Cancel for direct activities */}
                {(viewingActivity.isTask || viewingActivity.isLeave) ? (
                  <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>This item is synced from {viewingActivity.isTask ? "Task Management" : "Leave Management"}.</span>
                  </div>
                ) : viewingActivity.createdBy === myUid && (() => {
                  const canModify = isEditableOrCancellable(viewingActivity.date);
                  if (!canModify) {
                    return (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Activities can only be edited or cancelled at least 1 day in advance.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => startEdit(viewingActivity)}
                        className="flex-1 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Activity
                      </button>
                      <button
                        onClick={() => handleCancelActivity(viewingActivity)}
                        disabled={deletingId === viewingActivity.id}
                        className="flex-1 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        {deletingId === viewingActivity.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Cancel Activity
                      </button>
                    </div>
                  );
                })()}

                {/* Invited Attendees list in view mode */}
                {(viewingActivity.category === "meeting" || viewingActivity.category === "event") && (
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-amber-500" /> Invited Attendees & Groups
                      </p>
                      {viewingActivity.createdBy === myUid && onEditInvitees && (
                        <button
                          type="button"
                          onClick={() => onEditInvitees(viewingActivity)}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                          <span>Edit Invitees</span>
                        </button>
                      )}
                    </div>
                    {(viewingActivity.invitedConvoIds && viewingActivity.invitedConvoIds.length > 0) || (viewingActivity.invitedUsers && viewingActivity.invitedUsers.length > 0) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {viewingActivity.invitedConvoIds?.map(cid => {
                          const convo = conversations.find(c => c.id === cid);
                          const name = convo?.name || "Group";
                          return (
                            <div key={cid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate max-w-[120px]">{name}</span>
                            </div>
                          );
                        })}
                        {viewingActivity.invitedUsers?.map((uid, idx) => {
                          const p = memberProfiles[uid];
                          const name = p?.displayName || viewingActivity.invitedUserNames?.[idx] || p?.email || "Staff Member";
                          const rsvp = getEffectiveRSVPStatus(viewingActivity, uid);

                          let rsvpColor = "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200";
                          let rsvpLabel = "Pending";
                          if (rsvp === "accepted") {
                            rsvpColor = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200";
                            rsvpLabel = "Accepted";
                          } else if (rsvp === "declined") {
                            rsvpColor = "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200";
                            rsvpLabel = "Declined";
                          } else if (rsvp === "expired") {
                            rsvpColor = "bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-300";
                            rsvpLabel = "Expired";
                          }

                          return (
                            <div key={uid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                              <Avatar initials={getInitials(name)} color={colorFromStr(name)} photoURL={p?.photoURL} size="xs" />
                              <span className="truncate max-w-[90px]">{name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${rsvpColor}`}>
                                {rsvpLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No invitees added yet.</p>
                    )}

                    {/* RSVP Status & Buttons */}
                    <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">RSVP Status</p>
                      {viewingActivity.createdBy === myUid ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <span>You are the host.</span>
                          {viewingActivity.rsvps && Object.keys(viewingActivity.rsvps).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(viewingActivity.rsvps)
                                .filter(([uid]) => !viewingActivity.invitedUsers || viewingActivity.invitedUsers.includes(uid))
                                .map(([uid, _]) => {
                                const p = memberProfiles[uid];
                                const name = p?.displayName || p?.email || "Staff";
                                const rsvpStatus = getEffectiveRSVPStatus(viewingActivity, uid);

                                let colorClass = "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200";
                                let labelStr = "Pending";
                                if (rsvpStatus === "accepted") {
                                  colorClass = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200";
                                  labelStr = "Accepted";
                                } else if (rsvpStatus === "declined") {
                                  colorClass = "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200";
                                  labelStr = "Declined";
                                } else if (rsvpStatus === "expired") {
                                  colorClass = "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-300";
                                  labelStr = "Expired";
                                }

                                return (
                                  <span key={uid} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                                    {name}: {labelStr}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        (() => {
                          const myRsvp = getEffectiveRSVPStatus(viewingActivity, myUid);
                          if (myRsvp === "expired") {
                            return (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700">
                                <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                                <span>Invitation Expired</span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, "activities", viewingActivity.id), {
                                      [`rsvps.${myUid}`]: "accepted",
                                    });
                                    toast.success("RSVP Accepted!");
                                    setViewingActivity(prev => prev ? { ...prev, rsvps: { ...(prev.rsvps || {}), [myUid]: "accepted" } } : null);
                                    if (typeof onRefresh === "function") onRefresh();
                                  } catch (err) {
                                    console.error("RSVP Accept Error:", err);
                                    toast.error("Failed to update RSVP");
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  myRsvp === "accepted"
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{myRsvp === "accepted" ? "Accepted" : "Accept RSVP"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, "activities", viewingActivity.id), {
                                      [`rsvps.${myUid}`]: "declined",
                                    });
                                    toast.success("RSVP Declined.");
                                    setViewingActivity(prev => prev ? { ...prev, rsvps: { ...(prev.rsvps || {}), [myUid]: "declined" } } : null);
                                    if (typeof onRefresh === "function") onRefresh();
                                  } catch (err) {
                                    console.error("RSVP Decline Error:", err);
                                    toast.error("Failed to update RSVP");
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                  myRsvp === "declined"
                                    ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                    : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-rose-50 hover:text-rose-700"
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>{myRsvp === "declined" ? "Declined" : "Decline"}</span>
                              </button>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* Reminder badge in view mode */}
                {viewingActivity.reminderTime && viewingActivity.reminderTime !== "none" && (viewingActivity.category === "meeting" || viewingActivity.category === "event") && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Reminder: {REMINDER_OPTIONS.find(o => o.id === viewingActivity.reminderTime)?.label || viewingActivity.reminderTime}</span>
                  </div>
                )}

                {/* Other activities on this day */}
                {selectedDayActs.filter(a => a.id !== viewingActivity.id).length > 0 && (
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-1.5">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Also on this day</p>
                    {selectedDayActs.filter(a => a.id !== viewingActivity.id).map(act => (
                      <button key={act.id} onClick={() => setViewingActivity(act)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 text-left transition-colors"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_CONFIG[act.category].dot}`} />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{act.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedDay && selectedDay >= today && (
                  <button
                    onClick={() => { setViewingActivity(null); setForm({ title: "", description: "", startTime: "09:00", endTime: "10:00", allDay: false, category: "meeting", reminderTime: "15m" }); }}
                    className="w-full py-2 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all"
                  >
                    + Add another for this day
                  </button>
                )}
              </div>
            ) : (
              /* ─ Create mode ─ */
              <div className="p-4 space-y-4">

                {/* Category pills */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CREATABLE_CATEGORIES.map(cat => {
                      const cfg = CATEGORY_CONFIG[cat];
                      const isAct = form.category === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setForm(f => ({ ...f, category: cat }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                            isAct
                              ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                              : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-gray-300 dark:hover:border-zinc-600"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Title *</p>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Team sync, Design review..."
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSave(); }}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                {/* All-day toggle */}
                <div className="flex items-center justify-between py-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">All Day</p>
                  <button
                    onClick={() => setForm(f => ({ ...f, allDay: !f.allDay }))}
                    aria-pressed={form.allDay}
                    aria-label="Toggle all day"
                    className={`relative w-9 h-5 rounded-full transition-colors ${form.allDay ? "bg-amber-500" : "bg-gray-200 dark:bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${form.allDay ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>

                {/* Time pickers */}
                {!form.allDay && (
                  <div className="grid grid-cols-2 gap-2">
                    {(["startTime", "endTime"] as const).map((field, fi) => (
                      <div key={field}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">{fi === 0 ? "Start" : "End"}</p>
                        <input
                          type="time"
                          value={form[field]}
                          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full px-2.5 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Invite Attendees section for Meetings and Events */}
                {(form.category === "meeting" || form.category === "event") && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                        Invite Attendees
                      </p>
                      {invitedUserIds.length > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          {invitedUserIds.length} selected
                        </span>
                      )}
                    </div>

                    {/* Invite Type Tabs: Staff | Groups | Communities */}
                    <div className="flex gap-1 mb-2 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setInviteTab("staff")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          inviteTab === "staff"
                            ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                      >
                        Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteTab("group")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          inviteTab === "group"
                            ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                      >
                        Groups
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteTab("community")}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          inviteTab === "community"
                            ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                      >
                        Communities
                      </button>
                    </div>

                    {/* Selected badge pills */}
                    {(invitedConvoIds.length > 0 || invitedUserIds.length > 0) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {invitedConvoIds.map(cid => {
                          const convo = conversations.find(c => c.id === cid);
                          const name = convo?.name || "Group";
                          return (
                            <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate max-w-[120px]">{name}</span>
                              <button
                                type="button"
                                onClick={() => setInvitedConvoIds(prev => prev.filter(id => id !== cid))}
                                className="hover:text-rose-600 ml-0.5 shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                        {invitedUserIds.map(uid => {
                          const p = memberProfiles[uid];
                          const name = p?.displayName || p?.email || "Staff";
                          return (
                            <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <UserPlus className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate max-w-[100px]">{name}</span>
                              <button
                                type="button"
                                onClick={() => setInvitedUserIds(prev => prev.filter(id => id !== uid))}
                                className="hover:text-rose-600 ml-0.5 shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Selector List depending on inviteTab */}
                    <div className="max-h-36 overflow-y-auto space-y-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-1.5">
                      {inviteTab === "staff" && (
                        <>
                          {Object.values(memberProfiles)
                            .filter(u => u.id !== myUid)
                            .map(u => {
                              const isSelected = invitedUserIds.includes(u.id);
                              const name = u.displayName || u.email || "Staff Member";
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setInvitedUserIds(prev =>
                                      isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                    );
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                    isSelected
                                      ? "bg-amber-500 text-white font-bold"
                                      : "hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar initials={getInitials(name)} color={colorFromStr(name)} photoURL={u.photoURL} size="xs" />
                                    <span className="truncate">{name}</span>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          {Object.values(memberProfiles).filter(u => u.id !== myUid).length === 0 && (
                            <p className="text-[11px] text-gray-400 text-center py-2">No other staff members available</p>
                          )}
                        </>
                      )}

                      {(inviteTab === "group" || inviteTab === "community") && (
                        <>
                          {conversations
                            .filter(c => c.type === inviteTab)
                            .map(c => {
                              const memberUids = Object.keys(c.memberIds || {}).filter(id => id !== myUid);
                              const isGroupSelected = invitedConvoIds.includes(c.id);

                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setInvitedConvoIds(prev =>
                                      isGroupSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                    );
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                    isGroupSelected
                                      ? "bg-amber-500 text-white font-bold"
                                      : "hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold">#</span>
                                    <span className="truncate">{c.name || "Channel"}</span>
                                    <span className="text-[10px] opacity-75">({memberUids.length} members)</span>
                                  </div>
                                  {isGroupSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          {conversations.filter(c => c.type === inviteTab).length === 0 && (
                            <p className="text-[11px] text-gray-400 text-center py-2">
                              No active {inviteTab === "group" ? "groups" : "community channels"} found
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Reminder Time selector for Meetings and Events */}
                {(form.category === "meeting" || form.category === "event") && (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Reminder Time
                    </p>
                    <select
                      value={form.reminderTime}
                      onChange={e => setForm(f => ({ ...f, reminderTime: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white"
                    >
                      {REMINDER_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">Description</p>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Optional notes or details..."
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* Existing activities on this day */}
                {selectedDayActs.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-3">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Already on this day</p>
                    {selectedDayActs.map(act => (
                      <button key={act.id} onClick={() => openView(act)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 text-left transition-colors"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_CONFIG[act.category].dot}`} />
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{act.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save button — create / edit mode */}
          {!viewingActivity && (
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 shrink-0">
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingActivityId ? <Edit3 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                {saving ? "Saving..." : editingActivityId ? "Save Changes" : "Create Activity"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({
  activities,
  myUid,
  loading,
  onJoinMeeting,
  joiningMeeting,
  onEditInvitees,
}: {
  activities: Activity[];
  myUid: string;
  loading: boolean;
  onJoinMeeting: (act: Activity) => void;
  joiningMeeting: boolean;
  onEditInvitees: (act: Activity) => void;
}) {
  const [filter, setFilter] = useState<Activity["category"] | "all">("all");
  const today = dateToStr(new Date());

  const filtered = activities
    .filter(a => filter === "all" || a.category === filter)
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = filtered.filter(a => a.date >= today);
  const past     = [...filtered.filter(a => a.date < today)].reverse();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden animate-pulse bg-white dark:bg-zinc-900">
        {/* Header skeleton */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 space-y-3">
          <div className="space-y-1">
            <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
            <div className="h-3 w-20 bg-gray-100 dark:bg-zinc-800/60 rounded" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-16 bg-gray-100 dark:bg-zinc-800 rounded-xl shrink-0" />
            ))}
          </div>
        </div>

        {/* List skeleton */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-gray-100 dark:border-zinc-800/60">
              <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-44 bg-gray-200 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-16 bg-amber-100 dark:bg-amber-950/40 rounded-full" />
                </div>
                <div className="h-3 w-32 bg-gray-100 dark:bg-zinc-800/60 rounded" />
                <div className="h-3 w-3/4 bg-gray-100 dark:bg-zinc-800/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 shrink-0 space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Activity Feed</h2>
          <p className="text-xs text-gray-400 mt-0.5">{activities.length} {activities.length === 1 ? "activity" : "activities"} total</p>
        </div>
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
              filter === "all"
                ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                : "border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-amber-300"
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_CONFIG) as Activity["category"][]).map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  filter === cat
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                    : "border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto">
        {upcoming.length === 0 && past.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-4 shadow-sm">
              <Calendar className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No activities yet</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
              Switch to the <span className="font-semibold text-amber-600">Calendar</span> tab and click any day to create one
            </p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <div className="sticky top-0 px-5 py-2 bg-amber-50/90 dark:bg-amber-950/20 backdrop-blur-sm border-b border-amber-100 dark:border-amber-900/30 z-10">
                  <p className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Upcoming · {upcoming.length}</p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-zinc-800/60">
                  {upcoming.map(act => {
                    const cfg = CATEGORY_CONFIG[act.category];
                    const d = new Date(act.date + "T00:00");
                    return (
                      <div key={act.id} className="flex gap-3 px-5 py-3.5 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                            <span className={`text-sm font-extrabold ${cfg.text}`}>{d.getDate()}</span>
                          </div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{act.title}</p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                            <span>{d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</span>
                            {!act.allDay && act.startTime && (
                              <><span>·</span><span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{act.startTime}{act.endTime ? ` – ${act.endTime}` : ""}</span></>
                            )}
                            {act.allDay && <><span>·</span><span>All day</span></>}
                          </div>
                          {act.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{act.description}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">By <span className="font-semibold">{act.createdByName}</span></p>

                          {(act.category === "meeting" || act.category === "event") && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => onJoinMeeting(act)}
                                disabled={joiningMeeting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                              >
                                {joiningMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />}
                                <span>{joiningMeeting ? "Connecting..." : `Join Live ${act.category === "meeting" ? "Meeting" : "Event"}`}</span>
                              </button>

                              <button
                                onClick={() => onEditInvitees(act)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all border border-gray-200 dark:border-zinc-700"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                                <span>Invitees ({act.invitedUsers?.length || 0})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div className="opacity-60">
                <div className="sticky top-0 px-5 py-2 bg-gray-50/90 dark:bg-zinc-800/60 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-700 z-10">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Past · {past.length}</p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-zinc-800/60">
                  {past.map(act => {
                    const cfg = CATEGORY_CONFIG[act.category];
                    const d = new Date(act.date + "T00:00");
                    return (
                      <div key={act.id} className="flex gap-3 px-5 py-3.5">
                        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                            <span className={`text-sm font-extrabold ${cfg.text}`}>{d.getDate()}</span>
                          </div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{act.title}</p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-400">{d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Share Activity Modal ──────────────────────────────────────────────────

function ShareActivityModal({
  isOpen,
  onClose,
  activity,
  conversations,
  myUid,
  myName,
}: {
  isOpen: boolean;
  onClose: () => void;
  activity: { id?: string; title: string; date: string; category: string; startTime?: string; description?: string; invitedConvoIds?: string[] } | null;
  conversations: Conversation[];
  myUid: string;
  myName: string;
}) {
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [sharing, setSharing] = useState(false);

  if (!isOpen || !activity) return null;

  const joinUrl = activity.id ? `${typeof window !== "undefined" ? window.location.origin : ""}/meet/${activity.id}` : "";

  const handleShare = async () => {
    if (!selectedConvId) {
      toast.error("Please select a conversation or channel to share to.");
      return;
    }
    setSharing(true);
    try {
      const now = Date.now();
      const catLabel = activity.category === "meeting" ? "Meeting" : "Event";
      const shareText = `📅 New ${catLabel}: ${activity.title}\n📆 Date: ${friendlyDate(activity.date)}${activity.startTime ? `\n⏰ Time: ${activity.startTime}` : ""}${activity.description ? `\n📝 ${activity.description}` : ""}${joinUrl ? `\n🔗 Join Link: ${joinUrl}` : ""}`;

      await push(ref(rtdb, `messages/${selectedConvId}`), {
        senderId: myUid,
        senderName: myName,
        senderInitials: getInitials(myName),
        senderAvatarColor: colorFromStr(myName),
        text: shareText,
        sentAt: now,
        readBy: { [myUid]: true },
        type: "text",
      });

      const convo = conversations.find(c => c.id === selectedConvId);
      const batch: Record<string, any> = {
        [`conversations/${selectedConvId}/lastMessage`]: `📅 ${catLabel}: ${activity.title}`,
        [`conversations/${selectedConvId}/lastMessageSenderId`]: myUid,
        [`conversations/${selectedConvId}/lastMessageSenderName`]: myName,
        [`conversations/${selectedConvId}/lastMessageAt`]: now,
      };
      Object.keys(convo?.memberIds || {}).forEach(uid => {
        if (uid !== myUid)
          batch[`conversations/${selectedConvId}/unreadCount/${uid}`] = (convo?.unreadCount?.[uid] || 0) + 1;
      });
      await update(ref(rtdb), batch);

      if (activity.id) {
        try {
          await updateDoc(doc(db, "activities", activity.id), {
            invitedConvoIds: arrayUnion(selectedConvId),
          });
        } catch (e) {
          console.error("Failed to update activity invitedConvoIds", e);
        }
      }

      toast.success(`Shared to ${convo?.name || "conversation"}!`);
      onClose();
    } catch {
      toast.error("Failed to share event to conversation.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Share {activity.category === "meeting" ? "Meeting" : "Event"}?
              </h3>
              <p className="text-xs text-gray-400">You created this without inviting staff directly.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl space-y-1">
          <p className="text-xs font-bold text-gray-900 dark:text-white">{activity.title}</p>
          <p className="text-[11px] text-gray-400">
            {friendlyDate(activity.date)} {activity.startTime ? `at ${activity.startTime}` : ""}
          </p>
        </div>

        {/* Meeting Join Link with Copy button */}
        {joinUrl && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">
              Public Guest / Staff Join Link
            </p>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-1.5">
              <input
                type="text"
                readOnly
                value={joinUrl}
                className="flex-1 bg-transparent text-xs text-gray-600 dark:text-gray-300 focus:outline-none px-1"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(joinUrl);
                  toast.success("Meeting link copied to clipboard!");
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0"
              >
                <Bookmark className="w-3 h-3" /> Copy Link
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
            Select Chat or Channel to Share
          </p>
          <div className="max-h-44 overflow-y-auto space-y-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-1.5">
            {conversations.map(c => {
              const isSel = selectedConvId === c.id;
              const name = c.name || "Conversation";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                    isSel ? "bg-amber-500 text-white font-bold" : "hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                  }`}
                >
                  <span className="truncate">{name}</span>
                  {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
            {conversations.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No active conversations available</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 font-semibold text-xs rounded-xl transition-all"
          >
            Not Now
          </button>
          <button
            onClick={handleShare}
            disabled={!selectedConvId || sharing}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sharing ? "Sharing..." : "Share to Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Invitees Modal ───────────────────────────────────────────────────

function EditInviteesModal({
  isOpen,
  onClose,
  activity,
  memberProfiles,
  conversations,
  myUid,
  myName,
  onRefresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  memberProfiles: Record<string, StaffMember>;
  conversations: Conversation[];
  myUid: string;
  myName: string;
  onRefresh: () => void;
}) {
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [invitedConvoIds, setInvitedConvoIds] = useState<string[]>([]);
  const [inviteTab, setInviteTab] = useState<"staff" | "group" | "community">("staff");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activity) {
      setInvitedUserIds(activity.invitedUsers || []);
      setInvitedConvoIds(activity.invitedConvoIds || []);
    }
  }, [activity]);

  if (!isOpen || !activity) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const names = invitedUserIds.map(id => memberProfiles[id]?.displayName || memberProfiles[id]?.email || "Staff");
      const prevUsers = activity.invitedUsers || [];
      const removedUsers = prevUsers.filter(id => !invitedUserIds.includes(id));

      const updatePayload: Record<string, any> = {
        invitedUsers: invitedUserIds,
        invitedUserNames: names,
        invitedConvoIds: invitedConvoIds,
      };

      // Clear RSVP status when a user is kicked out so they don't remain as declined/accepted
      removedUsers.forEach(uid => {
        updatePayload[`rsvps.${uid}`] = deleteField();
      });

      await updateDoc(doc(db, "activities", activity.id), updatePayload);

      // Send DMs to newly added users
      const newUsers = invitedUserIds.filter(id => !prevUsers.includes(id));
      for (const targetUid of newUsers) {
        if (targetUid !== myUid) {
          const name = memberProfiles[targetUid]?.displayName || memberProfiles[targetUid]?.email || "Staff Member";
          try {
            await sendDMInviteNotification(myUid, myName, targetUid, name, activity.title, activity.date, activity.startTime || undefined, activity.category);
          } catch (e) { console.error("Error sending DM invite", e); }
        }
      }

      // Send DMs to removed users
      for (const targetUid of removedUsers) {
        if (targetUid !== myUid) {
          const name = memberProfiles[targetUid]?.displayName || memberProfiles[targetUid]?.email || "Staff Member";
          try {
            await sendDMRemovalNotification(myUid, myName, targetUid, name, activity.title, activity.category);
          } catch (e) { console.error("Error sending DM removal", e); }
        }
      }

      // Send messages to newly added groups/communities
      const prevConvos = activity.invitedConvoIds || [];
      const newConvos = invitedConvoIds.filter(id => !prevConvos.includes(id));
      for (const convId of newConvos) {
        try {
          await sendConvoInviteNotification(myUid, myName, convId, activity.title, activity.date, activity.startTime || undefined, activity.category);
        } catch (e) { console.error("Error sending convo invite", e); }
      }

      // Send messages to removed groups/communities
      const removedConvos = prevConvos.filter(id => !invitedConvoIds.includes(id));
      for (const convId of removedConvos) {
        try {
          await sendConvoRemovalNotification(myUid, myName, convId, activity.title, activity.category);
        } catch (e) { console.error("Error sending convo removal", e); }
      }

      toast.success("Invitees updated & DM notifications sent!");
      onRefresh();
      onClose();
    } catch {
      toast.error("Failed to update invitees.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Edit Invitees
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-[240px]">{activity.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Type Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setInviteTab("staff")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
              inviteTab === "staff"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setInviteTab("group")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
              inviteTab === "group"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Groups
          </button>
          <button
            type="button"
            onClick={() => setInviteTab("community")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
              inviteTab === "community"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Communities
          </button>
        </div>

        {/* Selected badge pills */}
        {(invitedConvoIds.length > 0 || invitedUserIds.length > 0) && (
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {invitedConvoIds.map(cid => {
              const convo = conversations.find(c => c.id === cid);
              const name = convo?.name || "Group";
              return (
                <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[120px]">{name}</span>
                  <button
                    type="button"
                    onClick={() => setInvitedConvoIds(prev => prev.filter(id => id !== cid))}
                    className="hover:text-rose-600 ml-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {invitedUserIds.map(uid => {
              const p = memberProfiles[uid];
              const name = p?.displayName || p?.email || "Staff";
              return (
                <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <UserPlus className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[100px]">{name}</span>
                  <button
                    type="button"
                    onClick={() => setInvitedUserIds(prev => prev.filter(id => id !== uid))}
                    className="hover:text-rose-600 ml-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Selector List */}
        <div className="max-h-48 overflow-y-auto space-y-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-1.5">
          {inviteTab === "staff" && (
            <>
              {Object.values(memberProfiles)
                .filter(u => u.id !== myUid)
                .map(u => {
                  const isSelected = invitedUserIds.includes(u.id);
                  const name = u.displayName || u.email || "Staff Member";
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setInvitedUserIds(prev =>
                          isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        );
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-amber-500 text-white font-bold"
                          : "hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar initials={getInitials(name)} color={colorFromStr(name)} photoURL={u.photoURL} size="xs" />
                        <span className="truncate">{name}</span>
                      </div>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold">
                          <Check className="w-3.5 h-3.5 shrink-0" /> Invited
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                          <UserPlus className="w-3 h-3 shrink-0" /> Invite
                        </span>
                      )}
                    </button>
                  );
                })}
            </>
          )}

          {(inviteTab === "group" || inviteTab === "community") && (
            <>
              {conversations
                .filter(c => c.type === inviteTab)
                .map(c => {
                  const memberUids = Object.keys(c.memberIds || {}).filter(id => id !== myUid);
                  const isGroupSelected = invitedConvoIds.includes(c.id);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setInvitedConvoIds(prev =>
                          isGroupSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        isGroupSelected
                          ? "bg-amber-500 text-white font-bold"
                          : "hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold">#</span>
                        <span className="truncate">{c.name || "Channel"}</span>
                        <span className="text-[10px] opacity-75">({memberUids.length} members)</span>
                      </div>
                      {isGroupSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : "Save Invitees"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "communities", label: "Communities", icon: Hash },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "activity", label: "Activity", icon: Zap },
];

export default function MessagingClient() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ displayName?: string; photoURL?: string; department?: string; role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as any);
        }
      },
      (err) => {
        console.warn("MessagingClient: Profile snapshot error", err);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Read initial tab from URL search params on mount & sync on popstate
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab && ["chat", "communities", "calendar", "activity"].includes(urlTab)) {
        setActiveTab(urlTab);
      }
    }

    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        if (urlTab && ["chat", "communities", "calendar", "activity"].includes(urlTab)) {
          setActiveTab(urlTab);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setActiveConvId(null);
    setShowMobileChat(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  };
  const [shareActivityPrompt, setShareActivityPrompt] = useState<{
    id?: string;
    title: string;
    date: string;
    category: string;
    startTime?: string;
    description?: string;
    invitedConvoIds?: string[];
  } | null>(null);
  const [editingInviteesActivity, setEditingInviteesActivity] = useState<Activity | null>(null);
  const [liveKitRoom, setLiveKitRoom] = useState<{
    isOpen: boolean;
    token: string;
    wsUrl: string;
    roomTitle: string;
    activityId?: string;
  }>({ isOpen: false, token: "", wsUrl: "", roomTitle: "" });
  const [joiningMeeting, setJoiningMeeting] = useState(false);

  const handleJoinLiveKitMeeting = async (act: Activity) => {
    const isHost = act.createdBy === myUid;
    const userRsvp = act.rsvps?.[myUid];

    if (!isHost && userRsvp !== "accepted") {
      try {
        await updateDoc(doc(db, "activities", act.id), {
          [`rsvps.${myUid}`]: "accepted",
        });
        fetchActivities();
        toast.info("RSVP Accepted! Connecting to meeting...");
      } catch (e) {
        console.error("Failed to update RSVP status", e);
      }
    }

    setJoiningMeeting(true);
    try {
      const roomId = `meeting_${act.id}`;
      const { generateLiveKitToken } = await import("@/lib/workstation/livekitToken");
      const { token, wsUrl } = await generateLiveKitToken(roomId, myName || "Staff", myUid);

      setLiveKitRoom({
        isOpen: true,
        token,
        wsUrl,
        roomTitle: `${act.category === "meeting" ? "Meeting" : "Event"}: ${act.title}`,
        activityId: act.id,
      });
    } catch (e: any) {
      toast.error("Error connecting to LiveKit room.");
    } finally {
      setJoiningMeeting(false);
    }
  };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [searchConvo, setSearchConvo] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<"emojis" | "stickers">("emojis");
  const [localStickerLibrary, setLocalStickerLibrary] = useState<Array<{ id: string; url: string; blob: Blob }>>([]);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<{
    id: string;
    senderName: string;
    text: string;
    type?: string;
  } | null>(null);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);

  const sendingStickerRef = useRef(false);

  // Close emoji picker on Escape key
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEmojiPicker(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showEmojiPicker]);
  
  // Drafts state stored per conversation in localStorage
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("aehub_chat_drafts");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Pending reply contexts stored per conversation in localStorage
  const [draftReplies, setDraftReplies] = useState<Record<string, {
    id: string; senderName: string; text: string; type?: string;
  }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("aehub_chat_draft_replies");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Sync draft text to localStorage whenever drafts change
  useEffect(() => {
    try {
      localStorage.setItem("aehub_chat_drafts", JSON.stringify(drafts));
    } catch (e) {
      console.error("Failed to save drafts to localStorage", e);
    }
  }, [drafts]);

  // Sync draft reply contexts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("aehub_chat_draft_replies", JSON.stringify(draftReplies));
    } catch (e) {
      console.error("Failed to save draft replies to localStorage", e);
    }
  }, [draftReplies]);

  // Load draft text AND pending reply context when switching active conversation
  useEffect(() => {
    if (activeConvId) {
      setNewMessage(drafts[activeConvId] || "");
      setReplyingToMessage(draftReplies[activeConvId] || null);
    }
  }, [activeConvId]);
  
  // Member profiles state for mentions and active conversation
  const [memberProfiles, setMemberProfiles] = useState<Record<string, StaffMember>>({});

  // Fetch profiles across all conversations for DM peer names, mentions, and avatars
  useEffect(() => {
    if (!conversations.length) return;

    (async () => {
      const profiles: Record<string, StaffMember> = { ...memberProfiles };
      const allUids = Array.from(new Set(conversations.flatMap(c => Object.keys(c.memberIds || {}))));
      let changed = false;

      for (const uid of allUids) {
        if (profiles[uid]) continue;
        try {
          const snap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
          snap.forEach(d => {
            profiles[uid] = { id: d.id, ...d.data() } as StaffMember;
            changed = true;
          });
        } catch (e) {
          console.error("Error loading profile for member", uid, e);
        }
      }
      if (changed) setMemberProfiles(profiles);
    })();
  }, [conversations]);

  // Mentions (@) state
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const myName = profile?.displayName || user?.email?.split("@")[0] || "Me";
  const myInitials = getInitials(myName);
  const myColor = colorFromStr(myName);
  const myPhotoURL = profile?.photoURL || null;
  const myUid = user?.uid || "";

  // ─── File Attachment Upload Handler ───
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId || !myUid || sending) return;

    // Limit attachment file size to 25MB
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size must be under 25MB.");
      return;
    }

    setSending(true);
    try {
      const isImage = file.type.startsWith("image/");
      const storagePath = isImage
        ? `chat_attachments/images/${activeConvId}/${Date.now()}_${file.name}`
        : `chat_attachments/files/${activeConvId}/${Date.now()}_${file.name}`;
      
      const fileRef = storageRef(storage, storagePath);
      await uploadBytes(fileRef, file);
      const mediaUrl = await getDownloadURL(fileRef);

      const now = Date.now();
      const convo = conversations.find(c => c.id === activeConvId);

      await push(ref(rtdb, `messages/${activeConvId}`), {
        senderId: myUid,
        senderName: myName,
        senderInitials: myInitials,
        senderAvatarColor: myColor,
        senderPhotoURL: myPhotoURL || null,
        text: file.name,
        mediaUrl,
        fileName: file.name,
        fileType: file.type,
        sentAt: now,
        readBy: { [myUid]: true },
        type: isImage ? "image" : "file",
      });

      const batch: Record<string, any> = {
        [`conversations/${activeConvId}/lastMessage`]: isImage ? "📷 Image" : `📎 ${file.name}`,
        [`conversations/${activeConvId}/lastMessageSenderId`]: myUid,
        [`conversations/${activeConvId}/lastMessageSenderName`]: myName,
        [`conversations/${activeConvId}/lastMessageAt`]: now,
      };
      Object.keys(convo?.memberIds || {}).forEach(uid => {
        if (uid !== myUid)
          batch[`conversations/${activeConvId}/unreadCount/${uid}`] = (convo?.unreadCount?.[uid] || 0) + 1;
      });
      await update(ref(rtdb), batch);

      toast.success("Attachment sent!");
    } catch (err) {
      console.error("Attachment upload error:", err);
      toast.error("Failed to send attachment.");
    } finally {
      setSending(false);
      if (e.target) e.target.value = "";
    }
  };

  // ─── Sticker Upload Handler (Adds to local favorites library only) ───
  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file for sticker.");
      return;
    }

    try {
      // 1. Compress image to WebP under 50KB
      const compressedBlob = await compressStickerImage(file, 50 * 1024);
      const stickerId = `sticker_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // 2. Store locally in IndexedDB as a personal favorite sticker
      await storeLocalSticker(stickerId, compressedBlob);

      toast.success("Sticker added to your favorites!");
    } catch (err) {
      console.error("Sticker upload error:", err);
      toast.error("Failed to add sticker to favorites.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const [onlinePresence, setOnlinePresence] = useState<Record<string, boolean>>({});

  // Real-time RTDB presence listener
  useEffect(() => {
    const presenceRef = ref(rtdb, "presence");
    const handler = onValue(presenceRef, (snap) => {
      const val = snap.val() || {};
      const presenceMap: Record<string, boolean> = {};
      Object.entries(val).forEach(([uid, data]: [string, any]) => {
        presenceMap[uid] = data?.online === true;
      });
      setOnlinePresence(presenceMap);
    });
    return () => off(presenceRef, "value", handler);
  }, []);

  // Conversations RTDB listener
  useEffect(() => {
    if (!myUid) return;
    const q = ref(rtdb, "conversations");
    const handler = onValue(q, snap => {
      const val = snap.val() || {};
      const userConvos = Object.entries(val)
        .map(([id, d]: [string, any]) => ({ id, ...d }))
        .filter(c => c.memberIds?.[myUid] === true)
        .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      setConversations(userConvos);
      setLoadingConvos(false);
    }, (err) => {
      console.error("Failed to load conversations:", err);
      const code = (err as any)?.code || "";
      if (code === "PERMISSION_DENIED") {
        setLoadError("Access denied. You may not have permission to view conversations. Please contact your admin.");
      } else if (!navigator.onLine) {
        setLoadError("You appear to be offline. Please check your network connection and refresh the page.");
      } else {
        setLoadError("Failed to load conversations. Please refresh the page or try again later.");
      }
      setLoadingConvos(false);
    });
    return () => off(q, "value", handler);
  }, [myUid, retryKey]);

  // Activities: fetch from Firestore when calendar or activity tab is active
  const fetchActivities = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? (activities.length > 0);
    if (!isSilent) {
      setLoadingActivities(true);
    }
    try {
      const isContentAdminOrAdmin =
        profile?.role === "admin" ||
        profile?.department === "content-admin" ||
        profile?.department === "ceo" ||
        profile?.department === "operations" ||
        profile?.department === "hr";

      // 1. Fetch created activities
      let userActivities: Activity[] = [];
      try {
        const actsSnap = await getDocs(collection(db, "activities"));
        userActivities = actsSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as Activity));
      } catch (e) {
        console.warn("Could not fetch activities:", e);
      }

      // 2. Fetch assigned tasks
      let tasksList: Activity[] = [];
      try {
        const tasksSnap = await getDocs(collection(db, "tasks"));
        tasksSnap.docs.forEach(d => {
          const t = d.data();
          const isAssignedToMe =
            t.assignee === myUid ||
            t.assignee === myName ||
            (Array.isArray(t.assignees) && t.assignees.some((a: any) => a.id === myUid || a.name === myName)) ||
            t.createdById === myUid;

          if (isContentAdminOrAdmin || isAssignedToMe) {
            if (t.dueDate) {
              tasksList.push({
                id: `task_${d.id}`,
                title: `Task: ${t.task || t.title || "Assigned Task"}`,
                description: `Status: ${t.status || "Pending"} · Priority: ${t.priority || "Medium"}${t.assignee ? ` · Assignee: ${t.assignee}` : ""}`,
                date: t.dueDate,
                allDay: true,
                category: "task",
                createdBy: t.createdById || "system",
                createdByName: t.createdByName || t.assignee || "Task Manager",
                createdAt: Date.now(),
                isTask: true,
              } as Activity);
            }
          }
        });
      } catch (e) {
        console.warn("Could not fetch tasks:", e);
      }

      // 3. Fetch leave requests (approved timeline)
      let leavesList: Activity[] = [];
      try {
        const leavesSnap = await getDocs(collection(db, "leaveRequests"));
        leavesSnap.docs.forEach(d => {
          const l = d.data();
          const isMyLeave = l.userId === myUid;
          const isApproved = l.status === "approved";

          if ((isContentAdminOrAdmin && isApproved) || (isMyLeave && (isApproved || l.status === "pending"))) {
            const start = l.startDate;
            const end = l.endDate || l.startDate;

            if (start) {
              const cur = new Date(start + "T00:00:00");
              const last = new Date((end || start) + "T00:00:00");

              while (cur <= last) {
                const dateStr = dateToStr(cur);
                leavesList.push({
                  id: `leave_${d.id}_${dateStr}`,
                  title: `Leave: ${l.userName || "Staff"} (${l.leaveType || "Leave"})`,
                  description: `Reason: ${l.reason || "N/A"} · Status: ${l.status?.toUpperCase()} · ${l.days || 1} day(s)`,
                  date: dateStr,
                  allDay: true,
                  category: "leave",
                  createdBy: l.userId || "system",
                  createdByName: l.userName || "Staff Member",
                  createdAt: Date.now(),
                  isLeave: true,
                } as Activity);
                cur.setDate(cur.getDate() + 1);
              }
            }
          }
        });
      } catch (e) {
        console.warn("Could not fetch leave requests:", e);
      }

      const combined = [...userActivities, ...tasksList, ...leavesList].sort(
        (a, b) => (a.date || "").localeCompare(b.date || "")
      );

      setActivities(combined);
    } catch (e: any) {
      console.error("Failed to load activities:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permissions")) {
        toast.error("Firestore Permission Error: Check security rules.");
      }
    } finally {
      setLoadingActivities(false);
    }
  }, [myUid, myName, profile, activities.length]);

  useEffect(() => {
    if (activeTab === "calendar" || activeTab === "activity") {
      fetchActivities();
    }
  }, [activeTab, fetchActivities]);

  // Sync editingInviteesActivity whenever activities update
  useEffect(() => {
    if (editingInviteesActivity) {
      const fresh = activities.find(a => a.id === editingInviteesActivity.id);
      if (fresh) setEditingInviteesActivity(fresh);
    }
  }, [activities]);

  // Messages RTDB listener with cancellation guard
  useEffect(() => {
    if (!activeConvId) return;
    setMessages([]);
    setLoadingMessages(true);
    let isCancelled = false;

    const msgsQuery = rtdbQuery(ref(rtdb, `messages/${activeConvId}`), orderByChild("sentAt"));
    const handler = onValue(msgsQuery, async snap => {
      const val = snap.val() || {};
      const rawMsgs: Message[] = Object.entries(val).map(([id, d]: [string, any]) => ({ id, ...d }));

      if (rawMsgs.length === 0) {
        if (!isCancelled) {
          setMessages([]);
          setLoadingMessages(false);
        }
        return;
      }

      // Collect unique sender IDs
      const senderIds = Array.from(new Set(rawMsgs.map(m => m.senderId)));
      const validUserIds = new Set<string>();

      // Verify senders safely without client-side message deletion
      for (const senderId of senderIds) {
        try {
          const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", senderId)));
          if (!userSnap.empty) {
            validUserIds.add(senderId);
          } else {
            // Keep message in UI safely rather than permanently deleting from client
            validUserIds.add(senderId);
          }
        } catch (e) {
          validUserIds.add(senderId);
        }
      }

      if (isCancelled) return;

      const validMsgs = rawMsgs.filter(m => validUserIds.has(m.senderId));
      setMessages(validMsgs);
      setLoadingMessages(false);

      if (!auth.currentUser || !myUid) return;

      const updates: Record<string, boolean> = {};
      validMsgs.forEach((d) => {
        if (d.senderId !== myUid && !d.readBy?.[myUid])
          updates[`${d.id}/readBy/${myUid}`] = true;
      });
      if (Object.keys(updates).length) {
        update(ref(rtdb, `messages/${activeConvId}`), updates).catch(() => {});
      }

      const activeConvoData = convos.find(c => c.id === activeConvId);
      if (activeConvoData?.unreadCount?.[myUid] && activeConvoData.unreadCount[myUid] > 0) {
        update(ref(rtdb, `conversations/${activeConvId}/unreadCount`), { [myUid]: 0 }).catch(() => {});
      }
    });

    return () => {
      isCancelled = true;
      off(msgsQuery, "value", handler);
    };
  }, [activeConvId, myUid]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const targetConvId = activeConvId;
    if (!newMessage.trim() || !targetConvId || !myUid || sending) return;
    const text = newMessage.trim();
    const replyToPayload = replyingToMessage ? { ...replyingToMessage } : null;
    setReplyingToMessage(null);
    setNewMessage("");
    if (targetConvId) {
      setDrafts(prev => { const copy = { ...prev }; delete copy[targetConvId]; return copy; });
      setDraftReplies(prev => { const copy = { ...prev }; delete copy[targetConvId]; return copy; });
    }
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setSending(true);
    try {
      const now = Date.now();
      const convo = conversations.find(c => c.id === targetConvId);
      const msgData: Record<string, any> = {
        senderId: myUid, senderName: myName, senderInitials: myInitials,
        senderAvatarColor: myColor, senderPhotoURL: myPhotoURL || null,
        text, sentAt: now, readBy: { [myUid]: true }, type: "text",
      };
      if (replyToPayload) msgData.replyTo = replyToPayload;

      await push(ref(rtdb, `messages/${targetConvId}`), msgData);
      const batch: Record<string, any> = {
        [`conversations/${targetConvId}/lastMessage`]: text,
        [`conversations/${targetConvId}/lastMessageSenderId`]: myUid,
        [`conversations/${targetConvId}/lastMessageSenderName`]: myName,
        [`conversations/${targetConvId}/lastMessageAt`]: now,
      };
      Object.keys(convo?.memberIds || {}).forEach(uid => {
        if (uid !== myUid)
          batch[`conversations/${targetConvId}/unreadCount/${uid}`] = (convo?.unreadCount?.[uid] || 0) + 1;
      });
      await update(ref(rtdb), batch);
    } catch (err: any) {
      console.error("Send failed:", err);
      const code = err?.code || "";
      if (code === "PERMISSION_DENIED") toast.error("Permission denied — you may have been removed from this chat.");
      else if (code === "NETWORK_ERROR" || !navigator.onLine) toast.error("No internet connection. Please check your network and try again.");
      else toast.error("Failed to send message. Please try again.");
      setNewMessage(text);
    }
    finally {
      setSending(false);
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.focus();
      }
    }
  };

  const handleDeleteMessage = async (msgId: string, senderId: string) => {
    if (!activeConvId) return;
    const convo = conversations.find(c => c.id === activeConvId);
    const isSender = senderId === myUid;
    const canDelete = isSender || isAdmin;
    if (!canDelete) { toast.error("You can't delete this message."); return; }

    const deletedByRole = isSender ? "self" : "admin";
    const deletionNotice = isSender
      ? "This message was deleted by author."
      : `This message was deleted by group admin (${myName}).`;

    try {
      await update(ref(rtdb, `messages/${activeConvId}/${msgId}`), {
        deleted: true,
        text: deletionNotice,
        deletedBy: myName,
        deletedByRole,
      });
      toast.success("Message deleted.");
    } catch (err: any) {
      console.error("Delete failed:", err);
      const code = err?.code || "";
      if (code === "PERMISSION_DENIED") toast.error("Permission denied — you don't have rights to delete this message.");
      else if (!navigator.onLine) toast.error("You appear to be offline. Deletion will retry when you reconnect.");
      else toast.error("Failed to delete message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const activeConvo = conversations.find(c => c.id === activeConvId);
  const userDept = (profile?.department || "").toLowerCase();
  const isDeptAdmin = ["ceo", "hr", "operation", "operations", "opm"].includes(userDept);
  const isAdmin = isDeptAdmin || !!(activeConvo?.adminIds?.[myUid]);
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount?.[myUid] || 0), 0);

  // Filter by tab
  const tabConvos = conversations.filter(c => {
    if (activeTab === "communities") return c.type === "community";
    if (activeTab === "chat") return c.type === "direct" || c.type === "group" || !c.type;
    return false;
  }).filter(c => (c.name || "").toLowerCase().includes(searchConvo.toLowerCase()));

  // Group messages by date
  const grouped = messages.reduce<{ date: number; msgs: Message[] }[]>((acc, msg) => {
    const day = msg.sentAt ? new Date(msg.sentAt).setHours(0,0,0,0) : 0;
    const last = acc[acc.length - 1];
    if (!last || last.date !== day) acc.push({ date: day, msgs: [msg] });
    else last.msgs.push(msg);
    return acc;
  }, []);

  // Upcoming live meeting banner within 30 minutes (only if user is invited AND group/community was explicitly invited)
  const upcomingMeetingBanner = React.useMemo(() => {
    if (!activeConvo) return null;
    const now = new Date();
    const todayStr = dateToStr(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const activeMemberUids = Object.keys(activeConvo.memberIds || {});

    return activities.find(act => {
      if (act.date !== todayStr) return false;
      if (act.category !== "meeting" && act.category !== "event") return false;

      // 1. Current user must be a participant (host or invited attendee)
      const participants = [act.createdBy, ...(act.invitedUsers || [])];
      const isUserParticipant = participants.includes(myUid);
      if (!isUserParticipant) return false;

      // 2. Determine if banner should show for this activeConvo:
      if (activeConvo.type === "direct") {
        // Direct chat: Show if the DM peer is also a meeting participant
        const otherUid = activeMemberUids.find(uid => uid !== myUid);
        if (!otherUid || !participants.includes(otherUid)) return false;
      } else {
        // Group or Community chat:
        // The group/community ITSELF must be explicitly invited!
        // (Even if individual members of the group are invited, the group banner only shows if the group was invited)
        const isGroupInvited = Array.isArray(act.invitedConvoIds) && act.invitedConvoIds.includes(activeConvo.id);
        if (!isGroupInvited) return false;
      }

      if (act.allDay) return true;
      if (!act.startTime) return false;

      const [h, m] = act.startTime.split(":").map(Number);
      const actMin = h * 60 + m;
      const diff = actMin - nowMin;
      // Show banner if meeting starts in <= 30 mins or started within last 60 mins
      return diff >= -60 && diff <= 30;
    }) || null;
  }, [activities, activeConvo, myUid]);


  if (loadError) {
    return (
      <div className="w-full flex flex-col items-center justify-center" style={{ height: "calc(100vh - 88px)" }}>
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-800 dark:text-white">Something went wrong</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{loadError}</p>
          </div>
          <button
            onClick={() => { setLoadError(null); setLoadingConvos(true); setRetryKey(k => k + 1); }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col" style={{ height: "calc(100vh - 88px)" }}>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Stay connected with your team across AEHub and Agunwami Enterprise</p>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">

        {/* Tabs */}
        <div role="tablist" className="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-zinc-800">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => handleTabChange(id)}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                activeTab === id
                  ? "text-amber-600 dark:text-amber-400 font-bold"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}>
              <Icon className="w-4 h-4" /> {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 flex min-h-0">

          {/* ── Calendar tab (full-width takeover) ───────────────────── */}
          {activeTab === "calendar" && (
            <CalendarTab
              myUid={myUid}
              myName={myName}
              memberProfiles={memberProfiles}
              conversations={conversations}
              activities={activities}
              loading={loadingActivities}
              onRefresh={fetchActivities}
              onSharePrompt={act => setShareActivityPrompt(act)}
              onJoinMeeting={handleJoinLiveKitMeeting}
              joiningMeeting={joiningMeeting}
              onEditInvitees={act => setEditingInviteesActivity(act)}
            />
          )}

          {/* ── Activity tab (full-width takeover) ───────────────────── */}
          {activeTab === "activity" && (
            <ActivityTab
              activities={activities}
              myUid={myUid}
              loading={loadingActivities}
              onJoinMeeting={handleJoinLiveKitMeeting}
              joiningMeeting={joiningMeeting}
              onEditInvitees={act => setEditingInviteesActivity(act)}
            />
          )}

          {/* ── Chat & Communities: left + right panels ──────────────── */}
          {(activeTab === "chat" || activeTab === "communities") && (<>
          {/* ── Left panel ──────────────────────────────────────────── */}
          <div className={`flex flex-col w-full md:w-72 lg:w-80 border-r border-gray-100 dark:border-zinc-800 shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"}`}>
            <div className="px-3 pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search conversations..." value={searchConvo} onChange={e => setSearchConvo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2">
                {totalUnread > 0 && (
                  <div className="flex-1 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl text-center">
                    {totalUnread} UNREAD
                  </div>
                )}
                <button onClick={() => setIsNewChatOpen(true)}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> NEW CHAT
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                // ── Skeleton conversation rows ──
                <div className="py-2 px-3 space-y-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-1 py-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded-full" style={{ width: `${55 + (i % 3) * 15}%` }} />
                          <div className="h-2.5 w-8 bg-gray-100 dark:bg-zinc-800 rounded-full" />
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full" style={{ width: `${40 + (i % 4) * 12}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tabConvos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-gray-300 dark:text-zinc-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No conversations yet</p>
                  <p className="text-xs text-gray-400">Click + NEW CHAT to start messaging</p>
                </div>
              ) : (
                <div className="py-1">
                  {tabConvos.map(convo => {
                    const unread = convo.unreadCount?.[myUid] || 0;
                    const isActive = activeConvId === convo.id;
                    const isDirect = convo.type === "direct";
                    const otherUid = isDirect
                      ? Object.keys(convo.memberIds || {}).find(uid => uid !== myUid) || ""
                      : "";
                    const peerProfile = otherUid ? memberProfiles[otherUid] : null;
                    const name = isDirect
                      ? peerProfile?.displayName || peerProfile?.email || convo.name || "Direct Message"
                      : convo.name || "Chat";
                    const photoURL = isDirect ? peerProfile?.photoURL || convo.photoURL : convo.photoURL;
                    const senderPrefix = convo.lastMessageSenderName ? `${convo.lastMessageSenderName.split(" ")[0]}: ` : "";
                    
                    // Determine online status for conversation row
                    const isOnline = isDirect
                      ? !!onlinePresence[otherUid]
                      : Object.keys(convo.memberIds || {}).some(uid => onlinePresence[uid]);

                    return (
                      <button key={convo.id} aria-current={isActive ? "true" : undefined} onClick={() => { setActiveConvId(convo.id); setShowMobileChat(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left relative ${isActive ? "bg-amber-50 dark:bg-amber-950/20" : "hover:bg-gray-50 dark:hover:bg-zinc-800/60"}`}>
                        {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-amber-500 rounded-r-full" />}
                        {/* Avatar + type badge */}
                        <div className="relative shrink-0">
                          <Avatar initials={getInitials(name)} color={convo.avatarColor || colorFromStr(name)} photoURL={photoURL} online={isOnline} />
                          <ConvTypeBadge type={convo.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-sm truncate ${unread > 0 ? "font-bold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-200"}`}>{name}</p>
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">{formatDate(convo.lastMessageAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            {drafts[convo.id] ? (
                              <p className="text-xs truncate font-medium text-rose-500 flex items-center gap-1">
                                <span className="font-bold uppercase tracking-wider text-[10px] bg-rose-100 dark:bg-rose-950/50 px-1.5 py-0.2 rounded-md">Draft</span>
                              </p>
                            ) : (
                              <p className={`text-xs truncate ${unread > 0 ? "text-gray-600 dark:text-gray-300 font-medium" : "text-gray-400"}`}>
                                {senderPrefix}{convo.lastMessage || "No messages yet"}
                              </p>
                            )}
                            {unread > 0 && (
                              <span className="ml-2 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                                {unread > 9 ? "9+" : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ─────────────────────────────────────────── */}
          <div className={`flex-1 flex flex-col min-w-0 ${!showMobileChat ? "hidden md:flex" : "flex"}`}>
            {!activeConvo ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-5">
                  <MessageSquare className="w-10 h-10 text-gray-300 dark:text-zinc-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Select a conversation</h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">Choose a conversation from the sidebar to start messaging with your team members or community.</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowMobileChat(false)} aria-label="Back to conversations" className="md:hidden p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 mr-1 transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {/* Avatar + type badge */}
                    {(() => {
                      const isDirect = activeConvo.type === "direct";
                      const otherUid = isDirect
                        ? Object.keys(activeConvo.memberIds || {}).find(uid => uid !== myUid) || ""
                        : "";
                      const peerProfile = otherUid ? memberProfiles[otherUid] : null;
                      const displayName = isDirect
                        ? peerProfile?.displayName || peerProfile?.email || activeConvo.name || "Direct Message"
                        : activeConvo.name || "Chat";
                      const isOnline = isDirect
                        ? !!onlinePresence[otherUid]
                        : Object.keys(activeConvo.memberIds || {}).some(uid => onlinePresence[uid]);

                      return (
                        <>
                          <div className="relative shrink-0">
                            <Avatar
                              initials={getInitials(displayName)}
                              color={activeConvo.avatarColor || colorFromStr(displayName)}
                              photoURL={isDirect ? peerProfile?.photoURL || activeConvo.photoURL : activeConvo.photoURL}
                              online={isOnline}
                            />
                            <ConvTypeBadge type={activeConvo.type} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{displayName}</p>
                              {activeConvo.type === "community" && <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Community</span>}
                              {activeConvo.type === "group" && <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">Group</span>}
                              {isAdmin && activeConvo.type !== "direct" && <Crown className="w-3 h-3 text-amber-500" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
                              <p className="text-xs text-gray-400">
                                {isDirect
                                  ? (isOnline ? "Online" : "Offline")
                                  : `${Object.keys(activeConvo.memberIds || {}).filter(uid => onlinePresence[uid]).length} online · ${Object.keys(activeConvo.memberIds || {}).length} members`}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeConvo.type === "community" && (
                      <button onClick={() => setIsAssignTaskOpen(true)} title="Assign task" aria-label="Assign task"
                        className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all">
                        <ClipboardList className="w-4 h-4" />
                      </button>
                    )}
                    {[Phone, Video].map((Icon, i) => (
                      <button key={i} disabled title="Coming soon" aria-label={i === 0 ? "Voice call (coming soon)" : "Video call (coming soon)"}
                        className="p-2 text-gray-300 dark:text-zinc-600 cursor-not-allowed rounded-xl transition-all">
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                    {activeConvo.type === "direct" && (
                      <button
                        onClick={async () => {
                          if (!confirm("Are you sure you want to delete this direct chat history?")) return;
                          try {
                            await remove(ref(rtdb, `messages/${activeConvo.id}`));
                            await remove(ref(rtdb, `conversations/${activeConvo.id}`));
                            setActiveConvId(null);
                            setShowMobileChat(false);
                            toast.success("Chat deleted.");
                          } catch (err) {
                            console.error("Failed to delete chat:", err);
                            toast.error("Failed to delete chat.");
                          }
                        }}
                        title="Delete chat"
                        className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {(activeConvo.type === "group" || activeConvo.type === "community") && (
                      <button onClick={() => setIsSettingsOpen(true)} title="Group settings"
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 30-minute Live Meeting Banner */}
                {upcomingMeetingBanner && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-sm shrink-0 animate-fadeIn border-b border-emerald-500">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-white animate-pulse" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-extrabold truncate">
                          Live {upcomingMeetingBanner.category === "meeting" ? "Meeting" : "Event"}: {upcomingMeetingBanner.title}
                        </p>
                        <p className="text-[10px] text-emerald-100 font-medium">
                          {upcomingMeetingBanner.startTime ? `Scheduled for ${upcomingMeetingBanner.startTime}` : "Happening Today"} · Join now to attend
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinLiveKitMeeting(upcomingMeetingBanner)}
                      disabled={joiningMeeting}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5 ml-2"
                    >
                      {joiningMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{joiningMeeting ? "Connecting..." : "Join Live Meeting"}</span>
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div aria-live="polite" className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/40 dark:bg-zinc-950/20">
                  {/* Skeleton message bubbles while messages are loading */}
                  {loadingMessages && messages.length === 0 && (
                    <div className="flex flex-col gap-4 py-4 animate-pulse">
                      {[
                        { isMe: false, w: "55%" }, { isMe: true, w: "40%" },
                        { isMe: false, w: "65%" }, { isMe: true, w: "30%" },
                        { isMe: false, w: "48%" }, { isMe: true, w: "55%" },
                      ].map(({ isMe, w }, i) => (
                        <div key={i} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                          {!isMe && <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-zinc-700 shrink-0" />}
                          <div
                            className={`h-9 rounded-2xl ${isMe ? "bg-amber-200/60 dark:bg-amber-900/30 rounded-br-sm" : "bg-gray-200 dark:bg-zinc-700 rounded-bl-sm"}`}
                            style={{ width: w }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* No messages empty state */}
                  {!loadingMessages && messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-gray-400">No messages yet — say hello! 👋</p>
                    </div>
                  )}
                  {grouped.map(({ date, msgs }) => (
                    <div key={date} className="space-y-1">
                      {date > 0 && <DateSeparator ms={date} />}
                      {msgs.map((msg, idx) => {
                        const isMe = msg.senderId === myUid;
                        const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                        const showAvatar = !isMe && msg.senderId !== prevMsg?.senderId;
                        const showName = showAvatar && (activeConvo.type === "group" || activeConvo.type === "community");
                        const isRead = Object.keys(msg.readBy || {}).some(uid => uid !== myUid);
                        const canDelete = msg.senderId === myUid || isAdmin;
                        const isHovered = hoveredMsgId === msg.id;
                        const isSenderOnline = !!onlinePresence[msg.senderId];

                        return (
                          <div key={msg.id}
                            onMouseEnter={() => setHoveredMsgId(msg.id)}
                            onMouseLeave={() => setHoveredMsgId(null)}
                            className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2 group ${idx > 0 && msgs[idx-1]?.senderId !== msg.senderId ? "mt-3" : "mt-0.5"}`}>
                            {!isMe && (
                              <div className="shrink-0 self-end mb-1 w-8">
                                {showAvatar && (
                                  <Avatar initials={msg.senderInitials || getInitials(msg.senderName)}
                                    color={msg.senderAvatarColor || colorFromStr(msg.senderName)}
                                    photoURL={msg.senderPhotoURL} size="sm" />
                                )}
                              </div>
                            )}
                            <div className={`max-w-[65%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              {showName && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 ml-1">{msg.senderName}</p>}
                              <div className="relative flex items-end gap-1.5">
                                {/* Hover Action Buttons (Reply & Delete) */}
                                {!msg.deleted && isHovered && (
                                  <div className={`flex items-center gap-1 shrink-0 ${isMe ? "order-first" : "order-last"}`}>
                                    <button
                                      onClick={() => {
                                        const rawText = msg.deleted
                                          ? "Deleted message"
                                          : msg.type === "sticker"
                                          ? "🎨 Sticker"
                                          : msg.type === "image"
                                          ? "📷 Image"
                                          : msg.type === "file"
                                          ? `📎 ${msg.fileName || "File"}`
                                          : msg.text;
                                        const replyCtx = {
                                          id: msg.id,
                                          senderName: msg.senderName,
                                          text: rawText.length > 120 ? rawText.slice(0, 120) + "..." : rawText,
                                          type: msg.type,
                                        };
                                        setReplyingToMessage(replyCtx);
                                        if (activeConvId) {
                                          setDraftReplies(prev => ({ ...prev, [activeConvId]: replyCtx }));
                                        }
                                        inputRef.current?.focus();
                                      }}
                                      title="Reply to message"
                                      className="p-1 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all"
                                    >
                                      <Reply className="w-3.5 h-3.5" />
                                    </button>
                                    {canDelete && (
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id, msg.senderId)}
                                        title="Delete message"
                                        className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                                <div
                                  id={`msg-${msg.id}`}
                                  className={`rounded-2xl leading-relaxed break-words transition-all duration-500 ${
                                    highlightMsgId === msg.id ? "ring-2 ring-amber-500 shadow-lg scale-[1.01]" : ""
                                  } ${
                                    msg.deleted
                                      ? "px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-400 italic text-xs"
                                      : msg.type === "sticker"
                                        ? "p-1 bg-transparent"
                                        : isMe
                                          ? "px-4 py-2.5 bg-amber-500 text-white rounded-br-md text-sm"
                                          : "px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-bl-md text-sm shadow-sm border border-gray-100 dark:border-zinc-700"
                                  }`}
                                >
                                  {/* Quoted Reply Banner */}
                                  {msg.replyTo && !msg.deleted && (
                                    <button
                                      onClick={() => {
                                        const replyId = msg.replyTo?.id;
                                        if (!replyId) return;
                                        const targetEl = document.getElementById(`msg-${replyId}`);
                                        if (targetEl) {
                                          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                          setHighlightMsgId(replyId);
                                          setTimeout(() => setHighlightMsgId(null), 2000);
                                        } else {
                                          toast.info("Original message is further up in history.");
                                        }
                                      }}
                                      title="Jump to original message"
                                      className={`w-full text-left mb-2 p-2 rounded-xl border-l-3 text-xs transition-opacity hover:opacity-90 cursor-pointer ${
                                        isMe
                                          ? "bg-amber-600/60 border-amber-200 text-amber-50"
                                          : "bg-gray-50 dark:bg-zinc-900/80 border-amber-500 text-gray-600 dark:text-gray-300"
                                      }`}
                                    >
                                      <p className="font-bold text-[11px] flex items-center gap-1 opacity-90">
                                        <Reply className="w-3 h-3" /> Replying to {msg.replyTo.senderName}
                                      </p>
                                      <p className="truncate opacity-80 mt-0.5 text-[11px]">{msg.replyTo.text}</p>
                                    </button>
                                  )}
                                  {(() => {
                                    const validMemberNames = Object.keys(activeConvo?.memberIds || {}).map(
                                      uid => memberProfiles[uid]?.displayName || memberProfiles[uid]?.email || ""
                                    ).filter(Boolean);

                                    return msg.deleted ? (
                                      msg.text
                                    ) : msg.type === "sticker" ? (
                                      <StickerImage
                                        stickerId={msg.stickerId}
                                        mediaUrl={msg.mediaUrl}
                                        isSaved={localStickerLibrary.some((stk) => stk.id === (msg.stickerId || msg.id))}
                                        onSaveToFavorites={async (url) => {
                                          try {
                                            const res = await fetch(url);
                                            const blob = await res.blob();
                                            const stickerId = msg.stickerId || `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                                            
                                            const file = new File([blob], `${stickerId}.webp`, { type: blob.type || "image/webp" });
                                            const compressedBlob = await compressStickerImage(file);
                                            await storeLocalSticker(stickerId, compressedBlob);

                                            const updated = await getAllLocalStickers();
                                            setLocalStickerLibrary(updated);
                                            toast.success("Sticker saved to your favorites!");
                                          } catch (err) {
                                            console.error("Failed to save sticker", err);
                                            toast.error("Could not save sticker to favorites.");
                                          }
                                        }}
                                      />
                                    ) : msg.type === "image" && msg.mediaUrl ? (
                                      <div className="space-y-1.5">
                                        <Image
                                          src={msg.mediaUrl}
                                          alt={msg.fileName || "Image"}
                                          width={240}
                                          height={200}
                                          className="rounded-xl object-cover max-h-56 w-auto"
                                          unoptimized
                                        />
                                        {msg.text && msg.text !== msg.fileName && <p><FormattedMessageText text={msg.text} isMe={isMe} validMemberNames={validMemberNames} /></p>}
                                      </div>
                                    ) : msg.type === "file" && msg.mediaUrl ? (
                                      <a
                                        href={msg.mediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 hover:underline"
                                      >
                                        <FileText className="w-5 h-5 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="font-semibold text-xs truncate max-w-[180px]">{msg.fileName || msg.text}</p>
                                          <p className="text-[10px] opacity-75">Click to download</p>
                                        </div>
                                      </a>
                                    ) : (
                                      (() => {
                                        const isInviteMsg = msg.text.includes("Invitation") || msg.text.includes("New Meeting") || msg.text.includes("New Event") || msg.text.includes("Live Meeting");
                                        const matchedActivity = isInviteMsg
                                          ? activities.find(a => msg.text.includes(a.title))
                                          : null;

                                        return (
                                          <div className="space-y-2">
                                            <FormattedMessageText text={msg.text} isMe={isMe} validMemberNames={validMemberNames} />

                                            {matchedActivity && (
                                              <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-2">
                                                {(() => {
                                                  const myRsvp = getEffectiveRSVPStatus(matchedActivity, myUid);

                                                  if (myRsvp === "expired") {
                                                    return (
                                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-75 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg">
                                                        <AlertCircle className="w-3 h-3" /> Event Expired
                                                      </span>
                                                    );
                                                  }

                                                  if (matchedActivity.createdBy === myUid) {
                                                    return (
                                                      <span className="text-[10px] font-bold opacity-75">
                                                        Host (RSVP Tracking in Calendar)
                                                      </span>
                                                    );
                                                  }

                                                  return (
                                                    <>
                                                      <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          try {
                                                            await updateDoc(doc(db, "activities", matchedActivity.id), {
                                                              [`rsvps.${myUid}`]: "accepted",
                                                            });
                                                            toast.success("RSVP Accepted!");
                                                            fetchActivities();
                                                          } catch {
                                                            toast.error("Failed to update RSVP");
                                                          }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                                          myRsvp === "accepted"
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                        }`}
                                                      >
                                                        <Check className="w-3.5 h-3.5" />
                                                        {myRsvp === "accepted" ? "Accepted" : "Accept RSVP"}
                                                      </button>

                                                      <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          try {
                                                            await updateDoc(doc(db, "activities", matchedActivity.id), {
                                                              [`rsvps.${myUid}`]: "declined",
                                                            });
                                                            toast.success("RSVP Declined.");
                                                            fetchActivities();
                                                          } catch {
                                                            toast.error("Failed to update RSVP");
                                                          }
                                                        }}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                                                          myRsvp === "declined"
                                                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                                        }`}
                                                      >
                                                        <X className="w-3.5 h-3.5" />
                                                        {myRsvp === "declined" ? "Declined" : "Decline"}
                                                      </button>

                                                      {(matchedActivity.category === "meeting" || matchedActivity.category === "event" || msg.text.includes("Live Meeting")) && myRsvp === "accepted" && (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleJoinLiveKitMeeting(matchedActivity);
                                                          }}
                                                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                                                        >
                                                          <Video className="w-3.5 h-3.5" /> Join Live Meeting
                                                        </button>
                                                      )}
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                                <span className="text-[10px] text-gray-400">{formatTimestamp(msg.sentAt)}</span>
                                {isMe && !msg.deleted && (isRead ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-400" />)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 relative">
                  {/* Tabbed Emoji / Sticker Picker Popover */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-16 right-12 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-80">
                      {/* Tabs */}
                      <div className="flex border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
                        <button
                          onClick={() => setPickerTab("emojis")}
                          className={`relative flex-1 py-2.5 text-xs font-bold transition-all ${
                            pickerTab === "emojis"
                              ? "text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-900"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          Emojis
                          {pickerTab === "emojis" && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setPickerTab("stickers");
                            getAllLocalStickers().then(setLocalStickerLibrary);
                          }}
                          className={`relative flex-1 py-2.5 text-xs font-bold transition-all ${
                            pickerTab === "stickers"
                              ? "text-amber-600 dark:text-amber-400 bg-white dark:bg-zinc-900"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          Custom Stickers
                          {pickerTab === "stickers" && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" />
                          )}
                        </button>
                      </div>

                      {/* Emoji Tab */}
                      {pickerTab === "emojis" && (
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setNewMessage((prev) => prev + emojiData.emoji);
                          }}
                          lazyLoadEmojis
                          width="100%"
                          height="320px"
                        />
                      )}

                      {/* Custom Stickers Tab */}
                      {pickerTab === "stickers" && (
                        <div className="p-3 h-[320px] overflow-y-auto space-y-3">
                          {/* Upload Sticker Trigger */}
                          <button
                            onClick={() => stickerInputRef.current?.click()}
                            disabled={sending}
                            className="w-full py-2.5 border-2 border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-all"
                          >
                            <Plus className="w-4 h-4" /> Upload Custom Sticker (.webp)
                          </button>

                          {/* Grid of Saved Local Stickers */}
                          <div className="grid grid-cols-3 gap-2">
                            {localStickerLibrary.map((stk) => (
                              <div key={stk.id} className="relative group/stkItem">
                                <button
                                  onClick={async () => {
                                    if (sendingStickerRef.current || !activeConvId || !myUid || sending) return;
                                    sendingStickerRef.current = true;
                                    setSending(true);
                                    try {
                                      const fileRef = storageRef(storage, `chat_attachments/stickers/${activeConvId}/${stk.id}.webp`);
                                      await uploadBytes(fileRef, stk.blob, { contentType: "image/webp" });
                                      const mediaUrl = await getDownloadURL(fileRef);

                                      const now = Date.now();
                                      const convo = conversations.find(c => c.id === activeConvId);

                                      await push(ref(rtdb, `messages/${activeConvId}`), {
                                        senderId: myUid, senderName: myName, senderInitials: myInitials,
                                        senderAvatarColor: myColor, senderPhotoURL: myPhotoURL || null,
                                        text: "Sent a sticker", mediaUrl, stickerId: stk.id,
                                        sentAt: now, readBy: { [myUid]: true }, type: "sticker",
                                      });

                                      const batch: Record<string, any> = {
                                        [`conversations/${activeConvId}/lastMessage`]: "🎨 Sticker",
                                        [`conversations/${activeConvId}/lastMessageSenderId`]: myUid,
                                        [`conversations/${activeConvId}/lastMessageSenderName`]: myName,
                                        [`conversations/${activeConvId}/lastMessageAt`]: now,
                                      };
                                      Object.keys(convo?.memberIds || {}).forEach(uid => {
                                        if (uid !== myUid)
                                          batch[`conversations/${activeConvId}/unreadCount/${uid}`] = (convo?.unreadCount?.[uid] || 0) + 1;
                                      });
                                      await update(ref(rtdb), batch);

                                      setShowEmojiPicker(false);
                                      toast.success("Sticker sent!");
                                    } catch (e) {
                                      toast.error("Failed to send sticker.");
                                    } finally {
                                      sendingStickerRef.current = false;
                                      setSending(false);
                                    }
                                  }}
                                  aria-label="Send sticker"
                                  className="w-full p-1.5 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:scale-105 transition-transform flex items-center justify-center"
                                >
                                  <Image src={stk.url} alt="Sticker" width={64} height={64} className="object-contain w-16 h-16" unoptimized />
                                </button>
                                
                                {/* Delete local sticker button */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await deleteLocalSticker(stk.id);
                                      const updated = await getAllLocalStickers();
                                      setLocalStickerLibrary(updated);
                                      toast.success("Sticker removed from favorites.");
                                    } catch (err) {
                                      toast.error("Failed to delete sticker.");
                                    }
                                  }}
                                  title="Delete sticker from favorites"
                                  aria-label="Delete sticker from favorites"
                                  className="absolute top-1 right-1 p-1 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover/stkItem:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {localStickerLibrary.length === 0 && (
                            <p className="text-center text-xs text-gray-400 py-6">No custom stickers saved yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hidden Attachment File Input */}
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />

                  {/* Hidden Sticker File Input */}
                  <input
                    type="file"
                    ref={stickerInputRef}
                    onChange={async (e) => {
                      await handleStickerUpload(e);
                      const updated = await getAllLocalStickers();
                      setLocalStickerLibrary(updated);
                    }}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Mentions (@) Autocomplete Popover (Group & Community only) */}
                  {showMentionList && activeConvo && activeConvo.type !== "direct" && (
                    <div className="absolute bottom-16 left-12 z-50 w-64 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <AtSign className="w-3 h-3 text-amber-500" /> Mention Member
                        </span>
                        <button onClick={() => setShowMentionList(false)} aria-label="Close mentions list" className="text-gray-400 hover:text-gray-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {/* Mention options */}
                      {(() => {
                        const membersList = Object.keys(activeConvo.memberIds || {})
                          .filter(uid => uid !== myUid)
                          .map(uid => {
                            const mName = memberProfiles[uid]?.displayName || memberProfiles[uid]?.email || uid.slice(0, 8);
                            return { uid, name: mName, profile: memberProfiles[uid], isAll: false };
                          });

                        const allOption = { uid: "all", name: "all", profile: null, isAll: true };
                        const options = "all".includes(mentionQuery.toLowerCase()) ? [allOption, ...membersList] : membersList;
                        const filteredOptions = options.filter(m => m.isAll || m.name.toLowerCase().includes(mentionQuery.toLowerCase()));

                        return filteredOptions.map((member) => (
                          <button
                            key={member.uid}
                            onClick={() => {
                              const text = newMessage;
                              const lastAtPos = text.lastIndexOf("@");
                              if (lastAtPos !== -1) {
                                const newText = text.slice(0, lastAtPos) + `@${member.name} `;
                                setNewMessage(newText);
                              }
                              setShowMentionList(false);
                              inputRef.current?.focus();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-amber-50 dark:hover:bg-zinc-700/60 transition-colors border-b border-gray-50 dark:border-zinc-700/40 last:border-0"
                          >
                            {member.isAll ? (
                              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                📢
                              </div>
                            ) : (
                              <Avatar initials={getInitials(member.name)} color={colorFromStr(member.name)} photoURL={member.profile?.photoURL} size="sm" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {member.isAll ? "@all" : member.name}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {member.isAll ? "Notify everyone in group" : (member.profile?.department || member.profile?.role || "Member")}
                              </p>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Active Reply Preview Bar */}
                  {replyingToMessage && (
                    <div className="mb-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <Reply className="w-3.5 h-3.5 text-amber-500" /> Replying to {replyingToMessage.senderName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">{replyingToMessage.text}</p>
                      </div>
                      <button
                        onClick={() => {
                          setReplyingToMessage(null);
                          if (activeConvId) {
                            setDraftReplies(prev => { const copy = { ...prev }; delete copy[activeConvId]; return copy; });
                          }
                        }}
                        aria-label="Cancel reply"
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500/50 transition-all">
                    {/* Attachment Button */}
                    <button
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={sending}
                      title="Attach file or image"
                      aria-label="Attach file or image"
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    
                    <textarea ref={inputRef} rows={1} value={newMessage}
                      maxLength={10000}
                      aria-label="Type a message"
                      onChange={e => {
                        const val = e.target.value;
                        setNewMessage(val);
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;

                        // Save draft for active conversation
                        if (activeConvId) {
                          setDrafts(prev => {
                            if (!val.trim()) {
                              const copy = { ...prev };
                              delete copy[activeConvId];
                              return copy;
                            }
                            return { ...prev, [activeConvId]: val };
                          });
                        }

                        // Trigger @ mention list for group/community only
                        if (activeConvo?.type !== "direct") {
                          const atIndex = val.lastIndexOf("@");
                          if (atIndex !== -1 && (atIndex === 0 || val[atIndex - 1] === " ")) {
                            const queryStr = val.slice(atIndex + 1);
                            if (!queryStr.includes(" ")) {
                              setMentionQuery(queryStr);
                              setShowMentionList(true);
                              return;
                            }
                          }
                        }
                        setShowMentionList(false);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={activeConvo?.type === "direct" ? "Type a message..." : "Type a message... (Use @ to mention)"}
                      className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 max-h-32 py-1" style={{ minHeight: "24px" }} />
                    
                    {/* Emoji & Custom Sticker Modal Toggle Button */}
                    <button
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      title="Emojis & Custom Stickers"
                      aria-label="Emojis and stickers"
                      className={`p-1.5 transition-colors shrink-0 mb-0.5 ${showEmojiPicker ? "text-amber-500" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    <button onClick={handleSend} disabled={!newMessage.trim() || sending || newMessage.length > 10000}
                      aria-label="Send message"
                      className="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl transition-all shrink-0 mb-0.5 shadow-sm">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Soft Character Warning / Info Footer */}
                  <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-gray-400">
                    <span>Enter to send · Shift+Enter for new line {activeConvo?.type !== "direct" ? "· Type @ to mention" : ""}</span>
                    {newMessage.length > 2000 && (
                      <span className={`font-semibold ${newMessage.length > 9000 ? "text-rose-500 font-bold" : "text-amber-500"}`}>
                        {newMessage.length.toLocaleString()} / 10,000 characters
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          </>)}
        </div>
      </div>

      {/* Modals */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)}
        myUid={myUid} myName={myName} myDept={profile?.department} onCreated={id => { setActiveConvId(id); setShowMobileChat(true); }} />

      <GroupSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        convo={activeConvo || null} myUid={myUid} myName={myName} myDept={profile?.department} />

      <AssignTaskModal isOpen={isAssignTaskOpen} onClose={() => setIsAssignTaskOpen(false)}
        convo={activeConvo || null} myUid={myUid} myName={myName} />

      <ShareActivityModal
        isOpen={!!shareActivityPrompt}
        onClose={() => setShareActivityPrompt(null)}
        activity={shareActivityPrompt}
        conversations={conversations}
        myUid={myUid}
        myName={myName}
      />

      <EditInviteesModal
        isOpen={!!editingInviteesActivity}
        onClose={() => setEditingInviteesActivity(null)}
        activity={editingInviteesActivity}
        memberProfiles={memberProfiles}
        conversations={conversations}
        myUid={myUid}
        myName={myName}
        onRefresh={fetchActivities}
      />

      <LiveKitMeetingModal
        isOpen={liveKitRoom.isOpen}
        onClose={() => setLiveKitRoom(prev => ({ ...prev, isOpen: false }))}
        token={liveKitRoom.token}
        wsUrl={liveKitRoom.wsUrl}
        roomTitle={liveKitRoom.roomTitle}
        activityId={liveKitRoom.activityId}
        memberProfiles={memberProfiles}
        myUid={myUid}
      />
    </div>
  );
}
