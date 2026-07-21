import { collection, doc, onSnapshot, query, where, orderBy, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ChatMessage {
  id: string; senderId: string; senderName: string;
  text: string; time: string; mine: boolean;
}

export interface Convo {
  id: string; name: string; preview: string; time: string;
  initials: string; color: string; unread: boolean;
}

const PALETTE = ['#f5bd02','#3b82f6','#8b5cf6','#0d9488','#ec4899','#22c55e','#f97316'];

function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function mkInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(ts: { toDate(): Date }): string {
  return ts.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

async function loadNameMap(): Promise<Map<string, string>> {
  const snap = await getDocs(collection(db, 'staff'));
  const m = new Map<string, string>();
  snap.docs.forEach(d => { m.set(d.id, (d.data().name as string) ?? d.id); });
  return m;
}

export function subscribeConvoMessages(
  convoId: string, uid: string,
  cb: (msgs: ChatMessage[]) => void,
): () => void {
  let realUnsub = () => {};
  loadNameMap().then(names => {
    const q = query(
      collection(db, 'messages', convoId, 'thread'),
      orderBy('sentAt', 'asc'),
    );
    realUnsub = onSnapshot(q, snap => {
      cb(snap.docs.map(d => {
        const data     = d.data();
        const senderId = data.senderId as string;
        return {
          id:         d.id,
          senderId,
          senderName: names.get(senderId) ?? 'Staff',
          text:       (data.text as string) ?? '',
          time:       data.sentAt ? formatTime(data.sentAt as { toDate(): Date }) : '',
          mine:       senderId === uid,
        };
      }));
    });
  });
  return () => realUnsub();
}

export async function sendMessage(convoId: string, uid: string, text: string): Promise<void> {
  await addDoc(collection(db, 'messages', convoId, 'thread'), {
    senderId: uid,
    text,
    sentAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'messages', convoId), {
    lastMessage:    text,
    lastMessageAt:  serverTimestamp(),
    unreadCount:    1,
  });
}

export function subscribeMessages(uid: string, cb: (convos: Convo[]) => void): () => void {
  let realUnsub = () => {};
  loadNameMap().then(names => {
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc'),
    );
    realUnsub = onSnapshot(q, snap => {
      cb(snap.docs.map(d => {
        const data  = d.data();
        const parts = (data.participants as string[]).filter(p => p !== uid);
        const name  = (data.name as string | undefined)
          ?? names.get(parts[0]) ?? parts[0] ?? 'Unknown';
        return {
          id:       d.id,
          name,
          preview:  data.lastMessage as string,
          time:     formatTime(data.lastMessageAt as { toDate(): Date }),
          initials: mkInitials(name),
          color:    colorFromId(d.id),
          unread:   (data.unreadCount as number) > 0,
        };
      }));
    });
  });
  return () => realUnsub();
}
