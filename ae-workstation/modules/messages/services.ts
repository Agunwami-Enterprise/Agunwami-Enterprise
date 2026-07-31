// Messaging backend removed — a teammate is wiring this module up to
// Realtime Database from his end. Static mock data only, for now.

export interface ChatMessage {
  id: string; senderId: string; senderName: string;
  text: string; time: string; mine: boolean;
}

export interface Convo {
  id: string; name: string; preview: string; time: string;
  initials: string; color: string; unread: boolean;
}

const MOCK_CONVOS: Convo[] = [
  { id: 'c1', name: 'Chioma Okafor', preview: 'Please send me the updated onboarding checklist.', time: '10:24 AM', initials: 'CO', color: '#f5bd02', unread: true },
  { id: 'c2', name: 'Emeka Nwosu',   preview: 'The vendor audit is almost done — should be in review by tomorrow.', time: 'Yesterday', initials: 'EN', color: '#3b82f6', unread: false },
  { id: 'c3', name: 'HR Team',       preview: "Kayode: I'll handle the handbook updates.", time: 'Mon', initials: 'HR', color: '#8b5cf6', unread: true },
  { id: 'c4', name: 'Tunde Bakare',  preview: 'The Zenith Bank proposal is looking strong.', time: 'Fri', initials: 'TB', color: '#22c55e', unread: false },
];

const MOCK_THREADS: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'm1', senderId: 'staff_chioma', senderName: 'Chioma Okafor', text: 'Good morning! Can you send over the updated onboarding checklist?', time: '10:02 AM', mine: false },
    { id: 'm2', senderId: 'me', senderName: 'You', text: 'Sure — sending it over now.', time: '10:24 AM', mine: true },
  ],
  c2: [
    { id: 'm3', senderId: 'staff_emeka', senderName: 'Emeka Nwosu', text: 'Quick update on the vendor audit — going through final supplier contracts now.', time: 'Yesterday', mine: false },
    { id: 'm4', senderId: 'staff_emeka', senderName: 'Emeka Nwosu', text: 'The vendor audit is almost done — should be in review by tomorrow.', time: 'Yesterday', mine: false },
  ],
  c3: [
    { id: 'm5', senderId: 'staff_kayode', senderName: 'Kayode Olatunji', text: "I'll handle the handbook updates.", time: 'Mon', mine: false },
  ],
  c4: [
    { id: 'm6', senderId: 'me', senderName: 'You', text: 'Tunde, how is the Zenith Bank proposal shaping up?', time: 'Fri', mine: true },
    { id: 'm7', senderId: 'staff_tunde', senderName: 'Tunde Bakare', text: 'The Zenith Bank proposal is looking strong. Will share the draft tonight.', time: 'Fri', mine: false },
  ],
};

const listeners: Record<string, Set<(msgs: ChatMessage[]) => void>> = {};

function notify(convoId: string): void {
  listeners[convoId]?.forEach(cb => cb(MOCK_THREADS[convoId] ?? []));
}

export function subscribeMessages(uid: string, cb: (convos: Convo[]) => void): () => void {
  cb(MOCK_CONVOS);
  return () => {};
}

export function subscribeConvoMessages(
  convoId: string, uid: string,
  cb: (msgs: ChatMessage[]) => void,
): () => void {
  (listeners[convoId] ??= new Set()).add(cb);
  cb(MOCK_THREADS[convoId] ?? []);
  return () => { listeners[convoId]?.delete(cb); };
}

export async function sendMessage(convoId: string, uid: string, text: string): Promise<void> {
  const list = MOCK_THREADS[convoId] ?? (MOCK_THREADS[convoId] = []);
  list.push({
    id: `local-${Date.now()}`, senderId: uid, senderName: 'You', text, mine: true,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  });
  notify(convoId);
}
