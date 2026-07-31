'use client';

import {
  collection, doc, getDoc, getDocs, setDoc, writeBatch, Timestamp,
  query, limit,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── helpers ──────────────────────────────────────────────────────────────────

const T = (d: Date) => Timestamp.fromDate(d);
const now        = () => new Date();
const daysAgo    = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead  = (n: number) => new Date(Date.now() + n * 86_400_000);
const minsAgo    = (n: number) => new Date(Date.now() - n * 60_000);
const avatar     = (email: string) => `https://i.pravatar.cc/150?u=${email}`;

async function isPopulated(col: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, col), limit(1)));
  return !snap.empty;
}

async function seedThreads(
  threads: Array<{ convoId: string; msgId: string; senderId: string; text: string; sentAt: Date }>,
  log: (msg: string) => void,
) {
  let written = 0; let skipped = 0;
  for (const m of threads) {
    const ref = doc(db, 'messages', m.convoId, 'thread', m.msgId);
    const existing = await getDoc(ref);
    if (existing.exists()) { skipped++; continue; }
    await setDoc(ref, { senderId: m.senderId, text: m.text, sentAt: T(m.sentAt) });
    written++;
  }
  if (written > 0) log(`✅ message threads — ${written} messages written`);
  if (skipped > 0) log(`⏭  message threads — ${skipped} already exist`);
}

async function seedCol(
  name: string,
  docs: Array<{ id: string; data: Record<string, unknown> }>,
  log: (msg: string) => void,
) {
  if (await isPopulated(name)) { log(`⏭  ${name} already seeded`); return; }
  const batch = writeBatch(db);
  for (const { id, data } of docs) batch.set(doc(db, name, id), data);
  await batch.commit();
  log(`✅ ${name} — ${docs.length} docs`);
}

// ─── role helpers ─────────────────────────────────────────────────────────────

function positionFor(role: string, dept: string): string {
  const map: Record<string, string> = {
    ceo: 'Chief Executive Officer', hr: 'HR Manager', manager: 'Department Manager',
    finance: 'Finance Analyst', opm: 'Operations Manager', staff: `${dept} Specialist`,
  };
  return map[role] ?? 'Staff';
}
function salaryFor(role: string): number {
  const map: Record<string, number> = {
    ceo: 0, manager: 450_000, hr: 320_000, finance: 350_000, opm: 380_000, staff: 280_000,
  };
  return map[role] ?? 250_000;
}
function locationFor(uid: string, UID: Record<string, string>): string {
  const map: Record<string, string> = {
    [UID.ceo]:      'Lagos, Nigeria',         [UID.chioma]:    'Lagos, Nigeria',
    [UID.emeka]:    'Abuja, Nigeria',         [UID.fatima]:    'Kano, Nigeria',
    [UID.oluwaseun]:'Lagos, Nigeria',         [UID.aminu]:     'Abuja, Nigeria',
    [UID.ngozi]:    'Enugu, Nigeria',         [UID.tunde]:     'Lagos, Nigeria',
    [UID.aisha]:    'Kaduna, Nigeria',        [UID.kayode]:    'Lagos, Nigeria',
    [UID.blessing]: 'Port Harcourt, Nigeria', [UID.ibrahim]:   'Kano, Nigeria',
  };
  return map[uid] ?? 'Lagos, Nigeria';
}

// ─── main export ──────────────────────────────────────────────────────────────

export async function seedDatabase(
  currentUid: string,
  onLog: (msg: string) => void,
): Promise<void> {
  // The logged-in user IS the CEO — use their real Firebase UID
  const UID = {
    ceo:       currentUid,
    chioma:    'staff_chioma_okafor_hr_001',
    emeka:     'staff_emeka_nwosu_opm_002',
    fatima:    'staff_fatima_abubakar_fin_003',
    oluwaseun: 'staff_oluwaseun_adeyemi_eng_004',
    aminu:     'staff_aminu_suleiman_opm_005',
    ngozi:     'staff_ngozi_eze_mkt_006',
    tunde:     'staff_tunde_bakare_sales_007',
    aisha:     'staff_aisha_yusuf_sup_008',
    kayode:    'staff_kayode_olatunji_hr_009',
    blessing:  'staff_blessing_nkem_eng_010',
    ibrahim:   'staff_ibrahim_musa_fin_011',
  };

  // ── users ──────────────────────────────────────────────────────────────────
  const userRows = [
    { id: UID.ceo,       data: { uid: UID.ceo,       name: 'Adewale Agunwami',    email: 'ceo@agunwami.com',               role: 'ceo',     department: 'Executive',        avatarUrl: avatar('ceo@agunwami.com'),               joinDate: T(new Date('2023-01-10')), status: 'active',   phone: '+234 801 000 0001' } },
    { id: UID.chioma,    data: { uid: UID.chioma,    name: 'Chioma Okafor',        email: 'chioma.okafor@agunwami.com',     role: 'hr',      department: 'Human Resources',  avatarUrl: avatar('chioma.okafor@agunwami.com'),     joinDate: T(new Date('2023-03-15')), status: 'active',   phone: '+234 802 000 0002' } },
    { id: UID.emeka,     data: { uid: UID.emeka,     name: 'Emeka Nwosu',          email: 'emeka.nwosu@agunwami.com',       role: 'manager', department: 'Operations',       avatarUrl: avatar('emeka.nwosu@agunwami.com'),       joinDate: T(new Date('2023-02-01')), status: 'active',   phone: '+234 803 000 0003' } },
    { id: UID.fatima,    data: { uid: UID.fatima,    name: 'Fatima Abubakar',      email: 'fatima.abubakar@agunwami.com',   role: 'finance', department: 'Finance',          avatarUrl: avatar('fatima.abubakar@agunwami.com'),   joinDate: T(new Date('2023-04-20')), status: 'active',   phone: '+234 804 000 0004' } },
    { id: UID.oluwaseun, data: { uid: UID.oluwaseun, name: 'Oluwaseun Adeyemi',    email: 'oluwaseun.adeyemi@agunwami.com', role: 'staff',   department: 'Engineering',      avatarUrl: avatar('oluwaseun.adeyemi@agunwami.com'), joinDate: T(new Date('2023-05-10')), status: 'active',   phone: '+234 805 000 0005' } },
    { id: UID.aminu,     data: { uid: UID.aminu,     name: 'Aminu Suleiman',       email: 'aminu.suleiman@agunwami.com',    role: 'opm',     department: 'Operations',       avatarUrl: avatar('aminu.suleiman@agunwami.com'),    joinDate: T(new Date('2023-06-01')), status: 'active',   phone: '+234 806 000 0006' } },
    { id: UID.ngozi,     data: { uid: UID.ngozi,     name: 'Ngozi Eze',            email: 'ngozi.eze@agunwami.com',         role: 'staff',   department: 'Marketing',        avatarUrl: avatar('ngozi.eze@agunwami.com'),         joinDate: T(new Date('2023-07-15')), status: 'active',   phone: '+234 807 000 0007' } },
    { id: UID.tunde,     data: { uid: UID.tunde,     name: 'Tunde Bakare',         email: 'tunde.bakare@agunwami.com',      role: 'manager', department: 'Sales',            avatarUrl: avatar('tunde.bakare@agunwami.com'),      joinDate: T(new Date('2023-08-01')), status: 'active',   phone: '+234 808 000 0008' } },
    { id: UID.aisha,     data: { uid: UID.aisha,     name: 'Aisha Yusuf',          email: 'aisha.yusuf@agunwami.com',       role: 'staff',   department: 'Support',          avatarUrl: avatar('aisha.yusuf@agunwami.com'),       joinDate: T(new Date('2023-09-10')), status: 'active',   phone: '+234 809 000 0009' } },
    { id: UID.kayode,    data: { uid: UID.kayode,    name: 'Kayode Olatunji',      email: 'kayode.olatunji@agunwami.com',   role: 'hr',      department: 'Human Resources',  avatarUrl: avatar('kayode.olatunji@agunwami.com'),   joinDate: T(new Date('2023-10-05')), status: 'active',   phone: '+234 810 000 0010' } },
    { id: UID.blessing,  data: { uid: UID.blessing,  name: 'Blessing Nkem',        email: 'blessing.nkem@agunwami.com',     role: 'staff',   department: 'Engineering',      avatarUrl: avatar('blessing.nkem@agunwami.com'),     joinDate: T(new Date('2024-01-08')), status: 'active',   phone: '+234 811 000 0011' } },
    { id: UID.ibrahim,   data: { uid: UID.ibrahim,   name: 'Ibrahim Musa',         email: 'ibrahim.musa@agunwami.com',      role: 'finance', department: 'Finance',          avatarUrl: avatar('ibrahim.musa@agunwami.com'),      joinDate: T(new Date('2024-02-14')), status: 'inactive', phone: '+234 812 000 0012' } },
  ];

  const staffRows = userRows.map(({ id, data }) => ({
    id,
    data: {
      ...data,
      position:       positionFor(data.role as string, data.department as string),
      salary:         salaryFor(data.role as string),
      employmentType: id === UID.ibrahim ? 'contract' : 'full-time',
      reportsTo:      data.role === 'ceo' ? null : UID.ceo,
      location:       locationFor(id, UID),
    },
  }));

  // ── tasks ──────────────────────────────────────────────────────────────────
  const tasks = [
    { id: 'task_001', data: { title: 'Prepare Q2 Financial Report',        assignedTo: UID.fatima,    assignedBy: UID.ceo,    dueDate: T(daysAhead(5)),  priority: 'high',   status: 'in-progress', createdAt: T(daysAgo(10)), tags: ['finance','report'] } },
    { id: 'task_002', data: { title: 'Onboard Three New Engineers',         assignedTo: UID.chioma,    assignedBy: UID.ceo,    dueDate: T(daysAhead(3)),  priority: 'high',   status: 'todo',        createdAt: T(daysAgo(2)),  tags: ['hr','onboarding'] } },
    { id: 'task_003', data: { title: 'Update Employee Handbook',            assignedTo: UID.kayode,    assignedBy: UID.chioma, dueDate: T(daysAhead(14)), priority: 'medium', status: 'todo',        createdAt: T(daysAgo(1)),  tags: ['hr','policy'] } },
    { id: 'task_004', data: { title: 'Audit Vendor Contracts',              assignedTo: UID.emeka,     assignedBy: UID.ceo,    dueDate: T(daysAgo(2)),   priority: 'high',   status: 'in-review',   createdAt: T(daysAgo(20)), tags: ['operations','legal'] } },
    { id: 'task_005', data: { title: 'Deploy Mobile App v2.1',              assignedTo: UID.oluwaseun, assignedBy: UID.emeka,  dueDate: T(daysAhead(7)),  priority: 'high',   status: 'in-progress', createdAt: T(daysAgo(5)),  tags: ['engineering','release'] } },
    { id: 'task_006', data: { title: 'Social Media Calendar — July',        assignedTo: UID.ngozi,     assignedBy: UID.tunde,  dueDate: T(daysAhead(4)),  priority: 'medium', status: 'in-progress', createdAt: T(daysAgo(3)),  tags: ['marketing','social'] } },
    { id: 'task_007', data: { title: 'Process June Payroll',                assignedTo: UID.fatima,    assignedBy: UID.ceo,    dueDate: T(daysAgo(1)),   priority: 'high',   status: 'completed',   createdAt: T(daysAgo(15)), tags: ['finance','payroll'] } },
    { id: 'task_008', data: { title: 'Client Proposal — Zenith Bank',       assignedTo: UID.tunde,     assignedBy: UID.ceo,    dueDate: T(daysAhead(2)),  priority: 'high',   status: 'in-review',   createdAt: T(daysAgo(7)),  tags: ['sales','proposal'] } },
    { id: 'task_009', data: { title: 'Fix Production Bug — Auth Module',    assignedTo: UID.blessing,  assignedBy: UID.oluwaseun, dueDate: T(daysAgo(1)), priority: 'high',   status: 'completed',   createdAt: T(daysAgo(4)),  tags: ['engineering','bug'] } },
    { id: 'task_010', data: { title: 'Conduct Performance Reviews — Q2',    assignedTo: UID.chioma,    assignedBy: UID.ceo,    dueDate: T(daysAhead(10)), priority: 'medium', status: 'todo',        createdAt: T(daysAgo(1)),  tags: ['hr','performance'] } },
    { id: 'task_011', data: { title: 'Upgrade Server Infrastructure',       assignedTo: UID.oluwaseun, assignedBy: UID.emeka,  dueDate: T(daysAhead(21)), priority: 'medium', status: 'todo',        createdAt: T(daysAgo(2)),  tags: ['engineering','infrastructure'] } },
    { id: 'task_012', data: { title: 'Reconcile June Accounts',             assignedTo: UID.ibrahim,   assignedBy: UID.fatima, dueDate: T(daysAhead(3)),  priority: 'high',   status: 'in-progress', createdAt: T(daysAgo(6)),  tags: ['finance','reconciliation'] } },
    { id: 'task_013', data: { title: 'Customer Support SLA Review',         assignedTo: UID.aisha,     assignedBy: UID.emeka,  dueDate: T(daysAhead(6)),  priority: 'medium', status: 'todo',        createdAt: T(daysAgo(1)),  tags: ['support','report'] } },
    { id: 'task_014', data: { title: 'Implement Dark Mode for Web App',     assignedTo: UID.blessing,  assignedBy: UID.oluwaseun, dueDate: T(daysAhead(9)), priority: 'low', status: 'in-progress', createdAt: T(daysAgo(3)),  tags: ['engineering','ui'] } },
    { id: 'task_015', data: { title: 'Office Equipment Inventory',          assignedTo: UID.aminu,     assignedBy: UID.emeka,  dueDate: T(daysAhead(8)),  priority: 'low',    status: 'todo',        createdAt: T(daysAgo(2)),  tags: ['operations','assets'] } },
    { id: 'task_016', data: { title: 'Renew Business Insurance Policy',     assignedTo: UID.emeka,     assignedBy: UID.ceo,    dueDate: T(daysAhead(15)), priority: 'medium', status: 'todo',        createdAt: T(daysAgo(1)),  tags: ['operations','compliance'] } },
    { id: 'task_017', data: { title: 'Launch Email Newsletter Campaign',    assignedTo: UID.ngozi,     assignedBy: UID.tunde,  dueDate: T(daysAhead(12)), priority: 'medium', status: 'todo',        createdAt: T(daysAgo(1)),  tags: ['marketing','email'] } },
    { id: 'task_018', data: { title: 'Negotiate Supplier Agreement — Dangote', assignedTo: UID.tunde, assignedBy: UID.ceo,    dueDate: T(daysAhead(18)), priority: 'high',   status: 'todo',        createdAt: T(daysAgo(0)),  tags: ['sales','negotiation'] } },
    { id: 'task_019', data: { title: 'Staff Training: Cyber Security Basics', assignedTo: UID.kayode, assignedBy: UID.chioma, dueDate: T(daysAhead(11)), priority: 'medium', status: 'todo',        createdAt: T(daysAgo(1)),  tags: ['hr','training'] } },
    { id: 'task_020', data: { title: 'Monthly Operations Report',           assignedTo: UID.aminu,     assignedBy: UID.ceo,    dueDate: T(daysAhead(1)),  priority: 'high',   status: 'in-review',   createdAt: T(daysAgo(8)),  tags: ['operations','report'] } },
  ];

  // ── messages ───────────────────────────────────────────────────────────────
  const messages = [
    { id: 'msg_001', data: { participants: [UID.ceo, UID.chioma],                                    lastMessage: 'Please send me the updated onboarding checklist.',                             lastMessageAt: T(daysAgo(0)), unreadCount: 1, type: 'direct' } },
    { id: 'msg_002', data: { participants: [UID.ceo, UID.emeka],                                     lastMessage: 'The vendor audit is almost done — should be in review by tomorrow.',           lastMessageAt: T(daysAgo(1)), unreadCount: 0, type: 'direct' } },
    { id: 'msg_003', data: { participants: [UID.ceo, UID.fatima],                                    lastMessage: 'June payroll is processed. Reports attached.',                                 lastMessageAt: T(daysAgo(1)), unreadCount: 2, type: 'direct' } },
    { id: 'msg_004', data: { participants: [UID.ceo, UID.tunde],                                     lastMessage: 'The Zenith Bank proposal is looking strong. Will share the draft tonight.',    lastMessageAt: T(daysAgo(2)), unreadCount: 0, type: 'direct' } },
    { id: 'msg_005', data: { participants: [UID.ceo, UID.oluwaseun],                                 lastMessage: 'v2.1 build passed QA. Deploying at 11 PM tonight.',                           lastMessageAt: T(daysAgo(2)), unreadCount: 1, type: 'direct' } },
    { id: 'msg_006', data: { participants: [UID.ceo, UID.ngozi],                                     lastMessage: 'July social calendar sent over for your approval.',                            lastMessageAt: T(daysAgo(3)), unreadCount: 0, type: 'direct' } },
    { id: 'msg_007', data: { participants: [UID.ceo, UID.aisha],                                     lastMessage: 'SLA report for June will be ready by Friday.',                                lastMessageAt: T(daysAgo(3)), unreadCount: 0, type: 'direct' } },
    { id: 'msg_008', data: { participants: [UID.ceo, UID.blessing],                                  lastMessage: 'Auth bug patched and deployed. No more random logouts.',                       lastMessageAt: T(daysAgo(4)), unreadCount: 0, type: 'direct' } },
    { id: 'msg_009', data: { participants: [UID.ceo, UID.aminu],                                     lastMessage: 'Operations report is 80% done. Just need the finance numbers.',               lastMessageAt: T(daysAgo(5)), unreadCount: 1, type: 'direct' } },
    { id: 'msg_010', data: { participants: [UID.ceo, UID.ibrahim],                                   lastMessage: 'June accounts reconciliation looks clean. Flagging two minor discrepancies.',  lastMessageAt: T(daysAgo(5)), unreadCount: 0, type: 'direct' } },
    { id: 'msg_011', data: { participants: [UID.ceo, UID.chioma, UID.kayode],  name: 'HR Team',       lastMessage: "Kayode: I'll handle the handbook. Chioma: reviews start Monday.",              lastMessageAt: T(daysAgo(1)), unreadCount: 3, type: 'group' } },
    { id: 'msg_012', data: { participants: [UID.ceo, UID.emeka, UID.aminu],    name: 'Operations',    lastMessage: 'Aminu: inventory 60% done. Emeka: finish by end of week.',                    lastMessageAt: T(daysAgo(2)), unreadCount: 0, type: 'group' } },
    { id: 'msg_013', data: { participants: [UID.ceo, UID.fatima, UID.ibrahim], name: 'Finance Team',  lastMessage: 'Ibrahim: reconciliation almost done. Fatima: send when ready.',                lastMessageAt: T(daysAgo(3)), unreadCount: 2, type: 'group' } },
    { id: 'msg_014', data: { participants: [UID.ceo, UID.oluwaseun, UID.blessing], name: 'Engineering', lastMessage: 'Next sprint planning is Thursday at 10 AM.',                               lastMessageAt: T(daysAgo(4)), unreadCount: 1, type: 'group' } },
    { id: 'msg_015', data: { participants: [UID.ceo, UID.tunde, UID.ngozi],    name: 'Sales & Marketing', lastMessage: "Tunde: let's sync on the Dangote pitch before Friday.",                  lastMessageAt: T(daysAgo(6)), unreadCount: 0, type: 'group' } },
  ];

  // ── message threads ────────────────────────────────────────────────────────
  const threadMessages = [
    { convoId:'msg_001', msgId:'t001_a', senderId:UID.chioma,    text:'Good morning! Can you send over the updated onboarding checklist? New hires join next week.', sentAt:minsAgo(122)  },
    { convoId:'msg_001', msgId:'t001_b', senderId:UID.ceo,       text:'Please send me the updated onboarding checklist.',                                              sentAt:minsAgo(90)   },
    { convoId:'msg_002', msgId:'t002_a', senderId:UID.emeka,     text:'Quick update on the vendor audit — we are going through the final supplier contracts now.',    sentAt:minsAgo(1502) },
    { convoId:'msg_002', msgId:'t002_b', senderId:UID.emeka,     text:'The vendor audit is almost done — should be in review by tomorrow.',                           sentAt:minsAgo(1440) },
    { convoId:'msg_003', msgId:'t003_a', senderId:UID.ceo,       text:'Fatima, can you confirm if the June payroll run has been completed?',                          sentAt:minsAgo(1600) },
    { convoId:'msg_003', msgId:'t003_b', senderId:UID.fatima,    text:'June payroll is processed. Reports attached.',                                                  sentAt:minsAgo(1440) },
    { convoId:'msg_004', msgId:'t004_a', senderId:UID.ceo,       text:'Tunde, how is the Zenith Bank proposal shaping up?',                                           sentAt:minsAgo(2902) },
    { convoId:'msg_004', msgId:'t004_b', senderId:UID.tunde,     text:'The Zenith Bank proposal is looking strong. Will share the draft tonight.',                    sentAt:minsAgo(2880) },
    { convoId:'msg_005', msgId:'t005_a', senderId:UID.oluwaseun, text:'Heads up — v2.1 is going through final QA checks now.',                                        sentAt:minsAgo(2902) },
    { convoId:'msg_005', msgId:'t005_b', senderId:UID.oluwaseun, text:'v2.1 build passed QA. Deploying at 11 PM tonight.',                                            sentAt:minsAgo(2880) },
    { convoId:'msg_006', msgId:'t006_a', senderId:UID.ngozi,     text:'I have drafted the July content calendar. Should I send it for your review?',                  sentAt:minsAgo(4322) },
    { convoId:'msg_006', msgId:'t006_b', senderId:UID.ngozi,     text:'July social calendar sent over for your approval.',                                             sentAt:minsAgo(4300) },
    { convoId:'msg_007', msgId:'t007_a', senderId:UID.ceo,       text:'Aisha, the board needs the SLA numbers for Q2 — when can we expect the June report?',          sentAt:minsAgo(4402) },
    { convoId:'msg_007', msgId:'t007_b', senderId:UID.aisha,     text:'SLA report for June will be ready by Friday.',                                                  sentAt:minsAgo(4320) },
    { convoId:'msg_008', msgId:'t008_a', senderId:UID.ceo,       text:'Blessing, there have been complaints about random session logouts. Is there a fix in progress?',sentAt:minsAgo(5802) },
    { convoId:'msg_008', msgId:'t008_b', senderId:UID.blessing,  text:'Auth bug patched and deployed. No more random logouts.',                                        sentAt:minsAgo(5760) },
    { convoId:'msg_009', msgId:'t009_a', senderId:UID.ceo,       text:'Aminu, what is the status on the monthly operations report?',                                   sentAt:minsAgo(7302) },
    { convoId:'msg_009', msgId:'t009_b', senderId:UID.aminu,     text:'Operations report is 80% done. Just need the finance numbers.',                                 sentAt:minsAgo(7200) },
    { convoId:'msg_010', msgId:'t010_a', senderId:UID.ibrahim,   text:'June accounts reconciliation is complete. Overall books are clean.',                            sentAt:minsAgo(7302) },
    { convoId:'msg_010', msgId:'t010_b', senderId:UID.ibrahim,   text:'June accounts reconciliation looks clean. Flagging two minor discrepancies.',                   sentAt:minsAgo(7200) },
    { convoId:'msg_011', msgId:'t011_a', senderId:UID.chioma,    text:'Performance reviews start Monday. Everyone please prepare your self-assessments.',              sentAt:minsAgo(1502) },
    { convoId:'msg_011', msgId:'t011_b', senderId:UID.kayode,    text:"I'll handle the handbook updates. Chioma: performance reviews start Monday.",                   sentAt:minsAgo(1440) },
    { convoId:'msg_012', msgId:'t012_a', senderId:UID.emeka,     text:'Team, equipment inventory needs to be wrapped up by end of week. Where are we?',               sentAt:minsAgo(2902) },
    { convoId:'msg_012', msgId:'t012_b', senderId:UID.aminu,     text:'Inventory 60% done. I will finish by Friday.',                                                  sentAt:minsAgo(2880) },
    { convoId:'msg_013', msgId:'t013_a', senderId:UID.fatima,    text:'Ibrahim, how far along is the June reconciliation?',                                           sentAt:minsAgo(4322) },
    { convoId:'msg_013', msgId:'t013_b', senderId:UID.ibrahim,   text:'Reconciliation almost done. Will send it over when ready.',                                     sentAt:minsAgo(4300) },
    { convoId:'msg_014', msgId:'t014_a', senderId:UID.oluwaseun, text:'Reminder: sprint planning is this Thursday at 10 AM. Please review the backlog beforehand.',   sentAt:minsAgo(5802) },
    { convoId:'msg_014', msgId:'t014_b', senderId:UID.blessing,  text:'Next sprint planning is Thursday at 10 AM.',                                                    sentAt:minsAgo(5760) },
    { convoId:'msg_015', msgId:'t015_a', senderId:UID.ngozi,     text:'Tunde, we need to align on the Dangote pitch strategy before Friday.',                         sentAt:minsAgo(8702) },
    { convoId:'msg_015', msgId:'t015_b', senderId:UID.tunde,     text:"Let's sync on the Dangote pitch before Friday.",                                               sentAt:minsAgo(8640) },
  ];

  // ── timeTracking ───────────────────────────────────────────────────────────
  const staffCycle = [UID.chioma, UID.emeka, UID.fatima, UID.oluwaseun, UID.aminu, UID.ngozi, UID.tunde, UID.aisha, UID.kayode, UID.blessing];
  const timeTracking: Array<{ id: string; data: Record<string, unknown> }> = [];
  for (let i = 0; i < 30; i++) {
    const day = daysAgo(i + 1);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const staffId  = staffCycle[i % staffCycle.length];
    const inH      = 7 + Math.floor(((i * 17) % 100) / 50);
    const inM      = (i * 7) % 30;
    const outH     = 16 + Math.floor(((i * 13) % 100) / 50);
    const outM     = (i * 11) % 60;
    const hoursWorked = parseFloat(((outH * 60 + outM - inH * 60 - inM) / 60).toFixed(1));
    const dayTs    = new Date(day); dayTs.setHours(0, 0, 0, 0);
    const clockIn  = new Date(day); clockIn.setHours(inH, inM, 0, 0);
    const clockOut = new Date(day); clockOut.setHours(outH, outM, 0, 0);
    timeTracking.push({
      id: `tt_${String(i + 1).padStart(3, '0')}`,
      data: { staffId, date: T(dayTs), clockIn: T(clockIn), clockOut: T(clockOut), hoursWorked, notes: 'Regular hours', status: i < 20 ? 'approved' : 'pending' },
    });
  }

  // ── documents ──────────────────────────────────────────────────────────────
  const documents = [
    { id: 'doc_001', data: { title: 'Employee Handbook 2024',          type: 'policy',   uploadedBy: UID.chioma,  uploadedAt: T(daysAgo(60)), fileUrl: 'https://placeholder.docs/handbook-2024.pdf',       size: '2.4 MB', department: 'Human Resources', tags: ['hr','policy'] } },
    { id: 'doc_002', data: { title: 'Q1 Financial Report',             type: 'report',   uploadedBy: UID.fatima,  uploadedAt: T(daysAgo(90)), fileUrl: 'https://placeholder.docs/q1-financial.pdf',        size: '1.8 MB', department: 'Finance',         tags: ['finance','q1'] } },
    { id: 'doc_003', data: { title: 'Service Agreement — Zenith Bank', type: 'contract', uploadedBy: UID.tunde,   uploadedAt: T(daysAgo(45)), fileUrl: 'https://placeholder.docs/zenith-agreement.pdf',    size: '890 KB', department: 'Sales',           tags: ['sales','contract'] } },
    { id: 'doc_004', data: { title: 'Q2 Operations Review',            type: 'report',   uploadedBy: UID.emeka,   uploadedAt: T(daysAgo(5)),  fileUrl: 'https://placeholder.docs/q2-ops.pdf',              size: '1.2 MB', department: 'Operations',      tags: ['operations','q2'] } },
    { id: 'doc_005', data: { title: 'Remote Work Policy Update',       type: 'policy',   uploadedBy: UID.chioma,  uploadedAt: T(daysAgo(14)), fileUrl: 'https://placeholder.docs/remote-policy.pdf',       size: '450 KB', department: 'Human Resources', tags: ['hr','policy','remote'] } },
    { id: 'doc_006', data: { title: 'Board Meeting Minutes — June',    type: 'memo',     uploadedBy: UID.ceo,     uploadedAt: T(daysAgo(20)), fileUrl: 'https://placeholder.docs/board-june.pdf',          size: '320 KB', department: 'Executive',       tags: ['executive','board'] } },
    { id: 'doc_007', data: { title: 'IT Asset Register',               type: 'report',   uploadedBy: UID.aminu,   uploadedAt: T(daysAgo(30)), fileUrl: 'https://placeholder.docs/asset-register.xlsx',     size: '560 KB', department: 'Operations',      tags: ['operations','assets'] } },
    { id: 'doc_008', data: { title: 'Marketing Strategy 2024',         type: 'report',   uploadedBy: UID.ngozi,   uploadedAt: T(daysAgo(40)), fileUrl: 'https://placeholder.docs/marketing-strategy.pdf',  size: '3.1 MB', department: 'Marketing',       tags: ['marketing','strategy'] } },
    { id: 'doc_009', data: { title: 'Supplier Agreement — Dangote',    type: 'contract', uploadedBy: UID.tunde,   uploadedAt: T(daysAgo(7)),  fileUrl: 'https://placeholder.docs/dangote-agreement.pdf',   size: '1.1 MB', department: 'Sales',           tags: ['sales','contract'] } },
    { id: 'doc_010', data: { title: 'June Payroll Summary',            type: 'report',   uploadedBy: UID.fatima,  uploadedAt: T(daysAgo(2)),  fileUrl: 'https://placeholder.docs/payroll-june.xlsx',       size: '240 KB', department: 'Finance',         tags: ['finance','payroll'] } },
  ];

  // ── leaveRequests ──────────────────────────────────────────────────────────
  const leaveRequests = [
    { id: 'lr_001', data: { staffId: UID.chioma,    staffName: 'Chioma Okafor',       leaveType: 'annual',    startDate: T(daysAhead(10)), endDate: T(daysAhead(17)),  daysRequested: 7,  reason: 'Family vacation.',          status: 'pending',  reviewedBy: null,    reviewedAt: null } },
    { id: 'lr_002', data: { staffId: UID.oluwaseun, staffName: 'Oluwaseun Adeyemi',   leaveType: 'sick',      startDate: T(daysAgo(3)),    endDate: T(daysAgo(1)),     daysRequested: 2,  reason: 'Fever and flu.',             status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(3)) } },
    { id: 'lr_003', data: { staffId: UID.ngozi,     staffName: 'Ngozi Eze',           leaveType: 'annual',    startDate: T(daysAhead(20)), endDate: T(daysAhead(24)),  daysRequested: 5,  reason: 'Personal travel.',           status: 'pending',  reviewedBy: null,    reviewedAt: null } },
    { id: 'lr_004', data: { staffId: UID.tunde,     staffName: 'Tunde Bakare',        leaveType: 'sick',      startDate: T(daysAgo(10)),   endDate: T(daysAgo(9)),     daysRequested: 1,  reason: 'Medical appointment.',       status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(10)) } },
    { id: 'lr_005', data: { staffId: UID.emeka,     staffName: 'Emeka Nwosu',         leaveType: 'annual',    startDate: T(daysAhead(30)), endDate: T(daysAhead(40)),  daysRequested: 10, reason: 'Annual family leave.',       status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(5)) } },
    { id: 'lr_006', data: { staffId: UID.aisha,     staffName: 'Aisha Yusuf',         leaveType: 'unpaid',    startDate: T(daysAgo(15)),   endDate: T(daysAgo(13)),    daysRequested: 2,  reason: 'Personal emergency.',        status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(16)) } },
    { id: 'lr_007', data: { staffId: UID.kayode,    staffName: 'Kayode Olatunji',     leaveType: 'annual',    startDate: T(daysAhead(50)), endDate: T(daysAhead(57)),  daysRequested: 7,  reason: 'Planned vacation.',          status: 'pending',  reviewedBy: null,    reviewedAt: null } },
    { id: 'lr_008', data: { staffId: UID.fatima,    staffName: 'Fatima Abubakar',     leaveType: 'sick',      startDate: T(daysAgo(20)),   endDate: T(daysAgo(20)),    daysRequested: 1,  reason: 'Migraine.',                  status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(20)) } },
    { id: 'lr_009', data: { staffId: UID.blessing,  staffName: 'Blessing Nkem',       leaveType: 'annual',    startDate: T(daysAhead(15)), endDate: T(daysAhead(16)),  daysRequested: 2,  reason: 'Wedding attendance.',        status: 'pending',  reviewedBy: null,    reviewedAt: null } },
    { id: 'lr_010', data: { staffId: UID.aminu,     staffName: 'Aminu Suleiman',      leaveType: 'annual',    startDate: T(daysAgo(30)),   endDate: T(daysAgo(25)),    daysRequested: 5,  reason: 'Annual leave.',              status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(31)) } },
    { id: 'lr_011', data: { staffId: UID.ibrahim,   staffName: 'Ibrahim Musa',        leaveType: 'sick',      startDate: T(daysAgo(7)),    endDate: T(daysAgo(5)),     daysRequested: 3,  reason: 'Illness — malaria.',         status: 'rejected', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(7)) } },
    { id: 'lr_012', data: { staffId: UID.chioma,    staffName: 'Chioma Okafor',       leaveType: 'maternity', startDate: T(daysAhead(60)), endDate: T(daysAhead(150)), daysRequested: 90, reason: 'Maternity leave.',           status: 'pending',  reviewedBy: null,    reviewedAt: null } },
    { id: 'lr_013', data: { staffId: UID.ngozi,     staffName: 'Ngozi Eze',           leaveType: 'sick',      startDate: T(daysAgo(45)),   endDate: T(daysAgo(44)),    daysRequested: 1,  reason: 'Stomach bug.',               status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(45)) } },
    { id: 'lr_014', data: { staffId: UID.oluwaseun, staffName: 'Oluwaseun Adeyemi',   leaveType: 'annual',    startDate: T(daysAhead(35)), endDate: T(daysAhead(37)),  daysRequested: 3,  reason: 'Holiday travel.',            status: 'pending',  reviewedBy: null,    reviewedAt: null } },
    { id: 'lr_015', data: { staffId: UID.tunde,     staffName: 'Tunde Bakare',        leaveType: 'annual',    startDate: T(daysAgo(60)),   endDate: T(daysAgo(55)),    daysRequested: 5,  reason: 'Annual vacation.',           status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(61)) } },
  ];

  // ── payments ───────────────────────────────────────────────────────────────
  const salaryStaff = ['chioma','emeka','fatima','oluwaseun','aminu','ngozi','tunde','aisha','kayode','blessing'] as const;
  const payments: Array<{ id: string; data: Record<string, unknown> }> = [
    ...salaryStaff.map((key, i) => {
      const u = userRows.find(r => r.id === UID[key])!;
      return {
        id: `pay_salary_june_${String(i + 1).padStart(2, '0')}`,
        data: { staffId: UID[key], staffName: u.data.name, amount: salaryFor(u.data.role as string), type: 'salary', date: T(new Date('2024-06-28')), status: 'paid', reference: `SAL-JUN-${String(i + 1).padStart(3, '0')}`, description: 'June 2024 salary payment' },
      };
    }),
    { id: 'pay_bonus_001',    data: { staffId: UID.tunde,     staffName: 'Tunde Bakare',     amount: 150_000, type: 'bonus',         date: T(new Date('2024-06-15')), status: 'paid',    reference: 'BON-Q2-001',     description: 'Q2 sales performance bonus' } },
    { id: 'pay_bonus_002',    data: { staffId: UID.oluwaseun, staffName: 'Oluwaseun Adeyemi',amount: 80_000,  type: 'bonus',         date: T(new Date('2024-06-15')), status: 'paid',    reference: 'BON-Q2-002',     description: 'Q2 engineering milestone bonus' } },
    { id: 'pay_reimb_001',    data: { staffId: UID.emeka,     staffName: 'Emeka Nwosu',      amount: 45_000,  type: 'reimbursement', date: T(daysAgo(5)),             status: 'pending', reference: 'REIMB-2024-001', description: 'Lagos–Abuja travel expenses' } },
    { id: 'pay_reimb_002',    data: { staffId: UID.chioma,    staffName: 'Chioma Okafor',    amount: 12_500,  type: 'reimbursement', date: T(daysAgo(10)),            status: 'paid',    reference: 'REIMB-2024-002', description: 'Training materials reimbursement' } },
    { id: 'pay_reimb_003',    data: { staffId: UID.aisha,     staffName: 'Aisha Yusuf',      amount: 8_000,   type: 'reimbursement', date: T(daysAgo(3)),             status: 'pending', reference: 'REIMB-2024-003', description: 'Internet subscription — June' } },
    { id: 'pay_failed_001',   data: { staffId: UID.ibrahim,   staffName: 'Ibrahim Musa',     amount: 0,       type: 'salary',        date: T(new Date('2024-06-28')), status: 'failed',  reference: 'SAL-JUN-012',   description: 'June salary — account details invalid' } },
  ];

  // ── notifications ──────────────────────────────────────────────────────────
  const notifications = [
    { id: 'notif_001', data: { recipientId: currentUid, type: 'task_assigned',     message: 'Fatima Abubakar submitted the Q2 Financial Report for review.',           read: false, createdAt: T(daysAgo(0)), relatedTo: { collection: 'tasks', docId: 'task_001' } } },
    { id: 'notif_002', data: { recipientId: currentUid, type: 'leave_approved',    message: 'Leave request from Chioma Okafor is pending your approval.',               read: false, createdAt: T(daysAgo(1)), relatedTo: { collection: 'leaveRequests', docId: 'lr_001' } } },
    { id: 'notif_003', data: { recipientId: currentUid, type: 'payment_processed', message: 'June payroll of ₦3,540,000 has been processed successfully.',              read: true,  createdAt: T(daysAgo(2)), relatedTo: { collection: 'payments', docId: 'pay_salary_june_01' } } },
    { id: 'notif_004', data: { recipientId: currentUid, type: 'task_assigned',     message: 'Tunde Bakare submitted the Zenith Bank proposal for your review.',         read: false, createdAt: T(daysAgo(1)), relatedTo: { collection: 'tasks', docId: 'task_008' } } },
    { id: 'notif_005', data: { recipientId: currentUid, type: 'announcement',      message: 'New announcement: Q3 Planning Workshop — save the date.',                  read: true,  createdAt: T(daysAgo(3)), relatedTo: { collection: 'announcements', docId: 'ann_001' } } },
    { id: 'notif_006', data: { recipientId: currentUid, type: 'payment_processed', message: 'Reimbursement request from Emeka Nwosu (₦45,000) is pending approval.',   read: false, createdAt: T(daysAgo(4)), relatedTo: { collection: 'payments', docId: 'pay_reimb_001' } } },
    { id: 'notif_007', data: { recipientId: currentUid, type: 'task_assigned',     message: 'Oluwaseun Adeyemi: Mobile App v2.1 deployed to production.',               read: true,  createdAt: T(daysAgo(5)), relatedTo: { collection: 'tasks', docId: 'task_005' } } },
    { id: 'notif_008', data: { recipientId: currentUid, type: 'leave_approved',    message: 'Ngozi Eze submitted an annual leave request (5 days) for review.',         read: false, createdAt: T(daysAgo(2)), relatedTo: { collection: 'leaveRequests', docId: 'lr_003' } } },
    { id: 'notif_009', data: { recipientId: currentUid, type: 'task_assigned',     message: 'Aminu Suleiman: Monthly Operations Report is ready for review.',           read: true,  createdAt: T(daysAgo(6)), relatedTo: { collection: 'tasks', docId: 'task_020' } } },
    { id: 'notif_010', data: { recipientId: currentUid, type: 'payment_processed', message: 'Payment failed for Ibrahim Musa — invalid account details.',               read: false, createdAt: T(daysAgo(3)), relatedTo: { collection: 'payments', docId: 'pay_failed_001' } } },
  ];

  // ── announcements ──────────────────────────────────────────────────────────
  const announcements = [
    { id: 'ann_001', data: { title: 'Q3 Planning Workshop — Save the Date',  body: 'The Q3 strategic planning workshop will be held on July 15th at the Lagos head office. All department heads must attend.',                             postedBy: UID.ceo,    postedAt: T(daysAgo(3)),  priority: 'normal', audienceRoles: ['ceo','manager','hr','finance','opm'] } },
    { id: 'ann_002', data: { title: 'Updated Remote Work Policy',             body: 'Effective August 1st, all staff are required to be in the office at least 3 days per week. The updated policy is in the documents portal.',              postedBy: UID.chioma, postedAt: T(daysAgo(14)), priority: 'normal', audienceRoles: ['ceo','manager','hr','finance','opm','staff'] } },
    { id: 'ann_003', data: { title: 'URGENT: System Maintenance Tonight',     body: 'AE Workstation will be down for maintenance from 11 PM to 2 AM tonight. Please save all work before 10:45 PM.',                                         postedBy: UID.ceo,    postedAt: T(daysAgo(1)),  priority: 'urgent', audienceRoles: ['ceo','manager','hr','finance','opm','staff'] } },
    { id: 'ann_004', data: { title: 'New Staff Parking Allocation',           body: 'Parking bays have been reassigned for Q3. Collect your new permit from the Operations desk by Friday.',                                                  postedBy: UID.aminu,  postedAt: T(daysAgo(7)),  priority: 'normal', audienceRoles: ['ceo','manager','hr','finance','opm','staff'] } },
    { id: 'ann_005', data: { title: 'Welcome — New Team Members!',            body: 'Please welcome Blessing Nkem (Engineering) and Ibrahim Musa (Finance) to the team. Their first day is today!',                                          postedBy: UID.chioma, postedAt: T(daysAgo(30)), priority: 'normal', audienceRoles: ['ceo','manager','hr','finance','opm','staff'] } },
  ];

  // ── training ───────────────────────────────────────────────────────────────
  const allUids = Object.values(UID);
  const training = [
    { id: 'trn_001', data: { title: 'Cyber Security Fundamentals',           assignedTo: allUids,                                              dueDate: T(daysAhead(11)), status: 'not-started', completionRate: 0,   category: 'Security',       isMandatory: true  } },
    { id: 'trn_002', data: { title: 'Leadership Excellence Programme',       assignedTo: [UID.ceo,UID.emeka,UID.tunde,UID.chioma],             dueDate: T(daysAhead(30)), status: 'in-progress', completionRate: 45,  category: 'Leadership',     isMandatory: false } },
    { id: 'trn_003', data: { title: 'Financial Reporting Standards (IFRS)',  assignedTo: [UID.fatima,UID.ibrahim],                             dueDate: T(daysAhead(21)), status: 'in-progress', completionRate: 60,  category: 'Finance',        isMandatory: true  } },
    { id: 'trn_004', data: { title: 'Data Privacy & NDPR Compliance',        assignedTo: [UID.ceo,UID.chioma,UID.kayode,UID.fatima,UID.oluwaseun,UID.blessing], dueDate: T(daysAgo(5)), status: 'in-progress', completionRate: 80, category: 'Compliance', isMandatory: true } },
    { id: 'trn_005', data: { title: 'Advanced Excel for Finance',             assignedTo: [UID.fatima,UID.ibrahim,UID.aminu],                   dueDate: T(daysAhead(14)), status: 'not-started', completionRate: 0,   category: 'Finance',        isMandatory: false } },
    { id: 'trn_006', data: { title: 'Customer Service Excellence',            assignedTo: [UID.aisha,UID.ngozi,UID.tunde],                      dueDate: T(daysAhead(7)),  status: 'completed',   completionRate: 100, category: 'Customer Service',isMandatory: false } },
    { id: 'trn_007', data: { title: 'React & Next.js for Engineering',        assignedTo: [UID.oluwaseun,UID.blessing],                         dueDate: T(daysAhead(45)), status: 'in-progress', completionRate: 30,  category: 'Engineering',    isMandatory: false } },
    { id: 'trn_008', data: { title: 'Health & Safety in the Workplace',       assignedTo: allUids,                                              dueDate: T(daysAgo(10)),   status: 'completed',   completionRate: 100, category: 'Health & Safety',isMandatory: true  } },
  ];

  // ── analytics ──────────────────────────────────────────────────────────────
  const analyticsEntries = [
    { id: 'staffOverview',     data: { totalStaff: 12, activeStaff: 11, newThisMonth: 1, byDepartment: { Engineering:2, Finance:2, 'Human Resources':2, Marketing:1, Operations:2, Sales:1, Support:1, Executive:1 }, byRole: { ceo:1, hr:2, manager:2, finance:2, opm:1, staff:4 } } },
    { id: 'taskSummary',       data: { total: 20, byStatus: { todo:9, 'in-progress':5, 'in-review':3, completed:3 }, completedThisMonth: 3, overdueCount: 2 } },
    { id: 'leaveOverview',     data: { pendingRequests: 6, approvedThisMonth: 6, byType: { annual:9, sick:5, unpaid:1, maternity:1 } } },
    { id: 'paymentSummary',    data: { totalPaidThisMonth: 4_245_000, pendingPayments: 3, monthlyTotals: [{ month:'Feb', total:3_540_000 },{ month:'Mar', total:3_620_000 },{ month:'Apr', total:3_720_000 },{ month:'May', total:3_890_000 },{ month:'Jun', total:4_245_000 },{ month:'Jul', total:0 }] } },
    { id: 'attendanceSummary', data: { averageHoursThisWeek: 38.5, lateArrivals: 3, onTimePercentage: 94, dailyHours: [{ day:'Mon', hours:8.2 },{ day:'Tue', hours:7.9 },{ day:'Wed', hours:8.5 },{ day:'Thu', hours:8.1 },{ day:'Fri', hours:7.5 },{ day:'Sat', hours:0 },{ day:'Sun', hours:0 }] } },
  ];

  // ── run ────────────────────────────────────────────────────────────────────
  await seedCol('users',         userRows,      onLog);
  await seedCol('staff',         staffRows,     onLog);
  await seedCol('tasks',         tasks,         onLog);
  await seedCol('messages',      messages,      onLog);
  await seedThreads(threadMessages,             onLog);
  await seedCol('timeTracking',  timeTracking,  onLog);
  await seedCol('documents',     documents,     onLog);
  await seedCol('leaveRequests', leaveRequests, onLog);
  await seedCol('payments',      payments,      onLog);
  await seedCol('notifications', notifications, onLog);
  await seedCol('announcements', announcements, onLog);
  await seedCol('training',      training,      onLog);
  await seedCol('analytics',     analyticsEntries, onLog);
}
