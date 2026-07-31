"use client";

import React, { useState, useEffect } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { X, Video, AlertCircle, UserPlus, Check, Search, Clock, UserX } from "lucide-react";
import { ref, get, push, update } from "firebase/database";
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { db, rtdb } from "@/lib/workstation/firebase";
import { toast } from "react-toastify";

interface StaffMember {
  id: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

interface LiveKitMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  wsUrl: string;
  roomTitle: string;
  activityId?: string;
  memberProfiles?: Record<string, StaffMember>;
  myUid?: string;
  myName?: string;
}

async function sendDMInviteNotification(
  myUid: string,
  myName: string,
  targetUid: string,
  targetName: string,
  roomTitle: string,
  activityId?: string
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
  if (!convId) {
    const convRef = push(ref(rtdb, "conversations"));
    convId = convRef.key!;
    await update(ref(rtdb, `conversations/${convId}`), {
      type: "direct",
      name: targetName,
      memberIds: { [myUid]: true, [targetUid]: true },
      adminIds: { [myUid]: true },
      lastMessage: `📹 Live Meeting Invite: ${roomTitle}`,
      lastMessageSenderId: myUid,
      lastMessageSenderName: myName,
      lastMessageAt: now,
      unreadCount: { [myUid]: 0, [targetUid]: 1 },
      createdAt: now,
    });
  }

  const text = `📹 **Live Meeting Invitation**\n\nYou have been invited to join: **${roomTitle}**\n\n*Host: ${myName}*\n\nPlease RSVP Accept in your calendar or chat banner to join the meeting.`;

  await push(ref(rtdb, `messages/${convId}`), {
    senderId: myUid,
    senderName: myName,
    text,
    sentAt: now,
    readBy: { [myUid]: true },
    type: "text",
  });

  const convoSnap = await get(ref(rtdb, `conversations/${convId}`));
  const convo = convoSnap.val();
  await update(ref(rtdb), {
    [`conversations/${convId}/lastMessage`]: `📹 Live Meeting Invite: ${roomTitle}`,
    [`conversations/${convId}/lastMessageSenderId`]: myUid,
    [`conversations/${convId}/lastMessageSenderName`]: myName,
    [`conversations/${convId}/lastMessageAt`]: now,
    [`conversations/${convId}/unreadCount/${targetUid}`]: ((convo?.unreadCount?.[targetUid] || 0) + 1),
  });
}

async function sendDMRemovalNotification(
  myUid: string,
  myName: string,
  targetUid: string,
  targetName: string,
  roomTitle: string
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
  if (!convId) {
    const convRef = push(ref(rtdb, "conversations"));
    convId = convRef.key!;
    await update(ref(rtdb, `conversations/${convId}`), {
      type: "direct",
      name: targetName,
      memberIds: { [myUid]: true, [targetUid]: true },
      adminIds: { [myUid]: true },
      lastMessage: `ℹ️ Removed from Live Meeting: ${roomTitle}`,
      lastMessageSenderId: myUid,
      lastMessageSenderName: myName,
      lastMessageAt: now,
      unreadCount: { [myUid]: 0, [targetUid]: 1 },
      createdAt: now,
    });
  }

  const text = `ℹ️ **Live Meeting Update**\n\nYou have been removed from the live meeting **${roomTitle}** by the host.`;

  await push(ref(rtdb, `messages/${convId}`), {
    senderId: myUid,
    senderName: myName,
    text,
    sentAt: now,
    readBy: { [myUid]: true },
    type: "text",
  });

  const convoSnap = await get(ref(rtdb, `conversations/${convId}`));
  const convo = convoSnap.val();
  await update(ref(rtdb), {
    [`conversations/${convId}/lastMessage`]: `ℹ️ Removed from Live Meeting: ${roomTitle}`,
    [`conversations/${convId}/lastMessageSenderId`]: myUid,
    [`conversations/${convId}/lastMessageSenderName`]: myName,
    [`conversations/${convId}/lastMessageAt`]: now,
    [`conversations/${convId}/unreadCount/${targetUid}`]: ((convo?.unreadCount?.[targetUid] || 0) + 1),
  });
}

export default function LiveKitMeetingModal({
  isOpen,
  onClose,
  token,
  wsUrl,
  roomTitle,
  activityId,
  memberProfiles = {},
  myUid,
  myName,
}: LiveKitMeetingModalProps) {
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [invitedUids, setInvitedUids] = useState<string[]>([]);
  const [searchStaff, setSearchStaff] = useState("");
  const [activityData, setActivityData] = useState<{
    createdBy?: string;
    invitedUsers?: string[];
    rsvps?: Record<string, "pending" | "accepted" | "declined" | "expired">;
    kickedUsers?: Record<string, boolean>;
  } | null>(null);

  useEffect(() => {
    if (!activityId) return;
    const unsub = onSnapshot(
      doc(db, "activities", activityId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setActivityData(data);

          // Auto-evict kicked user
          if (myUid && data.kickedUsers?.[myUid]) {
            toast.error("You have been removed from this meeting by the host.");
            onClose();
          }
        }
      },
      (err) => {
        console.warn("LiveKitMeetingModal: Activity snapshot error", err);
      }
    );
    return () => unsub();
  }, [activityId, myUid, onClose]);

  if (!isOpen) return null;

  const handleInviteStaff = async (u: StaffMember) => {
    const isAlreadyInvited = invitedUids.includes(u.id) || !!activityData?.invitedUsers?.includes(u.id);
    const name = u.displayName || u.email || "Staff Member";

    if (isAlreadyInvited) {
      toast.info(`${name} is already invited to this meeting.`);
      return;
    }

    setInvitedUids(prev => [...prev, u.id]);

    if (activityId) {
      try {
        await updateDoc(doc(db, "activities", activityId), {
          invitedUsers: arrayUnion(u.id),
          invitedUserNames: arrayUnion(name),
          [`rsvps.${u.id}`]: "pending",
        });

        if (myUid) {
          try {
            await sendDMInviteNotification(myUid, myName || "Host", u.id, name, roomTitle, activityId);
          } catch (err) {
            console.error("Failed to send DM invite notification", err);
          }
        }
        toast.success(`Invited ${name}! Chat notification sent.`);
      } catch (e) {
        toast.error("Failed to send invitation.");
      }
    } else {
      if (myUid) {
        try {
          await sendDMInviteNotification(myUid, myName || "Host", u.id, name, roomTitle);
        } catch (err) {
          console.error("Failed to send DM invite notification", err);
        }
      }
      toast.success(`Invited ${name}! Chat notification sent.`);
    }
  };

  const handleKickStaff = async (u: StaffMember) => {
    const name = u.displayName || u.email || "Staff Member";
    if (!confirm(`Are you sure you want to remove ${name} from this live meeting?`)) return;

    if (activityId) {
      try {
        await updateDoc(doc(db, "activities", activityId), {
          invitedUsers: arrayRemove(u.id),
          [`rsvps.${u.id}`]: "declined",
          [`kickedUsers.${u.id}`]: true,
        });

        if (myUid) {
          try {
            await sendDMRemovalNotification(myUid, myName || "Host", u.id, name, roomTitle);
          } catch (e) {}
        }
        toast.success(`Removed ${name} from meeting.`);
      } catch (e) {
        toast.error("Failed to remove staff from meeting.");
      }
    } else {
      toast.info(`${name} removed.`);
    }
  };

  const hostUid = activityData?.createdBy;
  const staffList = Object.values(memberProfiles).filter(
    u => u.id !== myUid && u.id !== hostUid && (u.displayName || u.email || "").toLowerCase().includes(searchStaff.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-900 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-zinc-800 shadow-2xl relative">

        {/* Top Room Header */}
        <div className="px-5 py-3.5 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">{roomTitle}</h2>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LiveKit Cloud Connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Invite Staff Button */}
            <button
              onClick={() => setShowInviteDrawer(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border ${
                showInviteDrawer
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite Staff
            </button>

            {/* Exit Room Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Exit Room
            </button>
          </div>
        </div>

        {/* Video Call Body + In-Call Staff Invite Popover */}
        <div className="flex-1 min-h-0 bg-black relative flex">
          {token && wsUrl ? (
            <div className="flex-1 h-full min-w-0">
              <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={wsUrl}
                onDisconnected={onClose}
                data-lk-theme="default"
                className="h-full"
              >
                <VideoConference />
              </LiveKitRoom>
            </div>
          ) : (
            <div className="h-full flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <p className="text-sm font-bold text-white">LiveKit Credentials Required</p>
              <p className="text-xs text-zinc-400 max-w-md mt-1">
                Please configure LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in your .env file.
              </p>
            </div>
          )}

          {/* In-Call Invite Staff Sidebar Drawer */}
          {showInviteDrawer && (
            <div className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 animate-fadeIn p-4 space-y-3 z-20">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" /> Manage Staff Invites
                </h3>
                <button
                  onClick={() => setShowInviteDrawer(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchStaff}
                  onChange={e => setSearchStaff(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Staff List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                {staffList.map(u => {
                  const isInvited = invitedUids.includes(u.id) || !!activityData?.invitedUsers?.includes(u.id);
                  const rsvpState = activityData?.rsvps?.[u.id];
                  const name = u.displayName || u.email || "Staff Member";

                  let badgeText = "Pending";
                  let badgeStyle = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
                  let IconComp = Clock;

                  if (isInvited) {
                    if (rsvpState === "accepted") {
                      badgeText = "Accepted";
                      badgeStyle = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
                      IconComp = Check;
                    } else if (rsvpState === "declined") {
                      badgeText = "Declined";
                      badgeStyle = "bg-rose-500/20 text-rose-400 border border-rose-500/30";
                      IconComp = X;
                    } else if (rsvpState === "expired") {
                      badgeText = "Expired";
                      badgeStyle = "bg-zinc-700/50 text-zinc-400 border border-zinc-600/40";
                      IconComp = AlertCircle;
                    } else {
                      badgeText = "Pending";
                      badgeStyle = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
                      IconComp = Clock;
                    }
                  }

                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50"
                    >
                      <span className="text-xs text-zinc-200 font-semibold truncate max-w-[110px]">{name}</span>
                      {isInvited ? (
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${badgeStyle}`}>
                            <IconComp className="w-3 h-3" />
                            {badgeText}
                          </span>
                          <button
                            onClick={() => handleKickStaff(u)}
                            title="Remove / Kick from Meeting"
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInviteStaff(u)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                        >
                          <UserPlus className="w-3 h-3" />
                          Invite
                        </button>
                      )}
                    </div>
                  );
                })}
                {staffList.length === 0 && (
                  <p className="text-[11px] text-zinc-500 text-center py-4">No staff members found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
