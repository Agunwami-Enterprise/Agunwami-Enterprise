/**
 * AE Workstation — Firestore Seed Script
 *
 * Usage:
 *   npx ts-node scripts/seedFirestore.ts
 *   (or: npm run seed)
 *
 * Prerequisites:
 *   Run once: gcloud auth application-default login
 *   This lets the Admin SDK authenticate without a service account key file.
 *
 * Idempotent: checks whether each collection already has data before writing.
 * Running twice will not duplicate records.
 *
 * ⚠️  UPDATE CEO_UID BELOW to match the real Firebase Auth uid of the CEO account
 *      you created in Firebase Console → Authentication → Users.
 */

import * as path from 'path';
import * as fs from 'fs';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

// ← REPLACE THIS with the actual uid from Firebase Console → Authentication → Users
const CEO_UID = 'REPLACE_WITH_REAL_CEO_UID';

const PROJECT_ID = 'agunwami-enterprise';

// Stable placeholder uids for non-CEO staff (must match across all collections)
const UID = {
  ceo:      CEO_UID,
  chioma:   'staff_chioma_okafor_hr_001',
  emeka:    'staff_emeka_nwosu_opm_002',
  fatima:   'staff_fatima_abubakar_fin_003',
  oluwaseun:'staff_oluwaseun_adeyemi_eng_004',
  aminu:    'staff_aminu_suleiman_opm_005',
  ngozi:    'staff_ngozi_eze_mkt_006',
  tunde:    'staff_tunde_bakare_sales_007',
  aisha:    'staff_aisha_yusuf_sup_008',
  kayode:   'staff_kayode_olatunji_hr_009',
  blessing: 'staff_blessing_nkem_eng_010',
  ibrahim:  'staff_ibrahim_musa_fin_011',
};

// ─── INIT ─────────────────────────────────────────────────────────────────────

const KEY_PATH = path.resolve(__dirname, '..', 'serviceAccountKey.json');
const credential = fs.existsSync(KEY_PATH)
  ? cert(KEY_PATH)
  : applicationDefault();

initializeApp({ credential, projectId: PROJECT_ID });
const db = getFirestore();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const T = (d: Date) => Timestamp.fromDate(d);
const now = new Date();
const daysAgo    = (n: number) => new Date(now.getTime() - n * 86_400_000);
const daysAhead  = (n: number) => new Date(now.getTime() + n * 86_400_000);
const minsAgo    = (n: number) => new Date(now.getTime() - n * 60_000);
const avatar    = (email: string) => `https://i.pravatar.cc/150?u=${email}`;

async function isPopulated(col: string): Promise<boolean> {
  const snap = await db.collection(col).limit(1).get();
  return !snap.empty;
}

async function seedCollection(
  name: string,
  docs: Array<{ id: string; data: Record<string, unknown> }>,
) {
  if (await isPopulated(name)) {
    console.log(`  ⏭  ${name} already seeded — skipping`);
    return;
  }
  const batch = db.batch();
  for (const { id, data } of docs) {
    batch.set(db.collection(name).doc(id), data);
  }
  await batch.commit();
  console.log(`  ✅ ${name} — ${docs.length} docs written`);
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const users = [
  {
    id: UID.ceo,
    data: {
      uid: UID.ceo, name: 'Adewale Agunwami', email: 'ceo@agunwami.com',
      role: 'ceo', department: 'Executive', avatarUrl: avatar('ceo@agunwami.com'),
      joinDate: T(new Date('2023-01-10')), status: 'active', phone: '+234 801 000 0001',
    },
  },
  {
    id: UID.chioma,
    data: {
      uid: UID.chioma, name: 'Chioma Okafor', email: 'chioma.okafor@agunwami.com',
      role: 'hr', department: 'Human Resources', avatarUrl: avatar('chioma.okafor@agunwami.com'),
      joinDate: T(new Date('2023-03-15')), status: 'active', phone: '+234 802 000 0002',
    },
  },
  {
    id: UID.emeka,
    data: {
      uid: UID.emeka, name: 'Emeka Nwosu', email: 'emeka.nwosu@agunwami.com',
      role: 'manager', department: 'Operations', avatarUrl: avatar('emeka.nwosu@agunwami.com'),
      joinDate: T(new Date('2023-02-01')), status: 'active', phone: '+234 803 000 0003',
    },
  },
  {
    id: UID.fatima,
    data: {
      uid: UID.fatima, name: 'Fatima Abubakar', email: 'fatima.abubakar@agunwami.com',
      role: 'finance', department: 'Finance', avatarUrl: avatar('fatima.abubakar@agunwami.com'),
      joinDate: T(new Date('2023-04-20')), status: 'active', phone: '+234 804 000 0004',
    },
  },
  {
    id: UID.oluwaseun,
    data: {
      uid: UID.oluwaseun, name: 'Oluwaseun Adeyemi', email: 'oluwaseun.adeyemi@agunwami.com',
      role: 'staff', department: 'Engineering', avatarUrl: avatar('oluwaseun.adeyemi@agunwami.com'),
      joinDate: T(new Date('2023-05-10')), status: 'active', phone: '+234 805 000 0005',
    },
  },
  {
    id: UID.aminu,
    data: {
      uid: UID.aminu, name: 'Aminu Suleiman', email: 'aminu.suleiman@agunwami.com',
      role: 'opm', department: 'Operations', avatarUrl: avatar('aminu.suleiman@agunwami.com'),
      joinDate: T(new Date('2023-06-01')), status: 'active', phone: '+234 806 000 0006',
    },
  },
  {
    id: UID.ngozi,
    data: {
      uid: UID.ngozi, name: 'Ngozi Eze', email: 'ngozi.eze@agunwami.com',
      role: 'staff', department: 'Marketing', avatarUrl: avatar('ngozi.eze@agunwami.com'),
      joinDate: T(new Date('2023-07-15')), status: 'active', phone: '+234 807 000 0007',
    },
  },
  {
    id: UID.tunde,
    data: {
      uid: UID.tunde, name: 'Tunde Bakare', email: 'tunde.bakare@agunwami.com',
      role: 'manager', department: 'Sales', avatarUrl: avatar('tunde.bakare@agunwami.com'),
      joinDate: T(new Date('2023-08-01')), status: 'active', phone: '+234 808 000 0008',
    },
  },
  {
    id: UID.aisha,
    data: {
      uid: UID.aisha, name: 'Aisha Yusuf', email: 'aisha.yusuf@agunwami.com',
      role: 'staff', department: 'Support', avatarUrl: avatar('aisha.yusuf@agunwami.com'),
      joinDate: T(new Date('2023-09-10')), status: 'active', phone: '+234 809 000 0009',
    },
  },
  {
    id: UID.kayode,
    data: {
      uid: UID.kayode, name: 'Kayode Olatunji', email: 'kayode.olatunji@agunwami.com',
      role: 'hr', department: 'Human Resources', avatarUrl: avatar('kayode.olatunji@agunwami.com'),
      joinDate: T(new Date('2023-10-05')), status: 'active', phone: '+234 810 000 0010',
    },
  },
  {
    id: UID.blessing,
    data: {
      uid: UID.blessing, name: 'Blessing Nkem', email: 'blessing.nkem@agunwami.com',
      role: 'staff', department: 'Engineering', avatarUrl: avatar('blessing.nkem@agunwami.com'),
      joinDate: T(new Date('2024-01-08')), status: 'active', phone: '+234 811 000 0011',
    },
  },
  {
    id: UID.ibrahim,
    data: {
      uid: UID.ibrahim, name: 'Ibrahim Musa', email: 'ibrahim.musa@agunwami.com',
      role: 'finance', department: 'Finance', avatarUrl: avatar('ibrahim.musa@agunwami.com'),
      joinDate: T(new Date('2024-02-14')), status: 'inactive', phone: '+234 812 000 0012',
    },
  },
];

const staff = users.map(({ id, data }) => ({
  id,
  data: {
    ...data,
    position: positionFor(data.role as string, data.department as string),
    salary: salaryFor(data.role as string),
    employmentType: id === UID.ibrahim ? 'contract' : 'full-time',
    reportsTo: data.role === 'ceo' ? null : UID.ceo,
    location: locationFor(id),
  },
}));

function positionFor(role: string, dept: string): string {
  const map: Record<string, string> = {
    ceo: 'Chief Executive Officer', hr: 'HR Manager', manager: 'Department Manager',
    finance: 'Finance Analyst', opm: 'Operations Manager', staff: `${dept} Specialist`,
  };
  return map[role] ?? 'Staff';
}
function salaryFor(role: string): number {
  const map: Record<string, number> = {
    ceo: 0, manager: 450000, hr: 320000, finance: 350000, opm: 380000, staff: 280000,
  };
  return map[role] ?? 250000;
}
function locationFor(uid: string): string {
  const map: Record<string, string> = {
    [UID.ceo]: 'Lagos, Nigeria', [UID.chioma]: 'Lagos, Nigeria', [UID.emeka]: 'Abuja, Nigeria',
    [UID.fatima]: 'Kano, Nigeria', [UID.oluwaseun]: 'Lagos, Nigeria', [UID.aminu]: 'Abuja, Nigeria',
    [UID.ngozi]: 'Enugu, Nigeria', [UID.tunde]: 'Lagos, Nigeria', [UID.aisha]: 'Kaduna, Nigeria',
    [UID.kayode]: 'Lagos, Nigeria', [UID.blessing]: 'Port Harcourt, Nigeria', [UID.ibrahim]: 'Kano, Nigeria',
  };
  return map[uid] ?? 'Lagos, Nigeria';
}

const tasks = [
  { id: 'task_001', data: { title: 'Prepare Q2 Financial Report', description: 'Compile all Q2 revenue, expenses, and profit margins into the board report template.', assignedTo: UID.fatima, assignedBy: UID.ceo, dueDate: T(daysAhead(5)), priority: 'high', status: 'in-progress', createdAt: T(daysAgo(10)), tags: ['finance', 'report'] } },
  { id: 'task_002', data: { title: 'Onboard Three New Engineers', description: 'Complete onboarding checklist, provision accounts, and schedule orientation sessions.', assignedTo: UID.chioma, assignedBy: UID.ceo, dueDate: T(daysAhead(3)), priority: 'high', status: 'todo', createdAt: T(daysAgo(2)), tags: ['hr', 'onboarding'] } },
  { id: 'task_003', data: { title: 'Update Employee Handbook', description: 'Incorporate new remote-work policy and updated leave entitlements.', assignedTo: UID.kayode, assignedBy: UID.chioma, dueDate: T(daysAhead(14)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(1)), tags: ['hr', 'policy'] } },
  { id: 'task_004', data: { title: 'Audit Vendor Contracts', description: 'Review all active vendor contracts for renewal dates and price escalations.', assignedTo: UID.emeka, assignedBy: UID.ceo, dueDate: T(daysAgo(2)), priority: 'high', status: 'in-review', createdAt: T(daysAgo(20)), tags: ['operations', 'legal'] } },
  { id: 'task_005', data: { title: 'Deploy Mobile App v2.1', description: 'Push the latest build to both App Store and Play Store. Notify QA when live.', assignedTo: UID.oluwaseun, assignedBy: UID.emeka, dueDate: T(daysAhead(7)), priority: 'high', status: 'in-progress', createdAt: T(daysAgo(5)), tags: ['engineering', 'release'] } },
  { id: 'task_006', data: { title: 'Social Media Calendar — July', description: 'Plan and schedule 30 posts across Instagram, LinkedIn, and X for July.', assignedTo: UID.ngozi, assignedBy: UID.tunde, dueDate: T(daysAhead(4)), priority: 'medium', status: 'in-progress', createdAt: T(daysAgo(3)), tags: ['marketing', 'social'] } },
  { id: 'task_007', data: { title: 'Process June Payroll', description: 'Verify timesheets, apply deductions, and process payroll via the finance system.', assignedTo: UID.fatima, assignedBy: UID.ceo, dueDate: T(daysAgo(1)), priority: 'high', status: 'completed', createdAt: T(daysAgo(15)), tags: ['finance', 'payroll'] } },
  { id: 'task_008', data: { title: 'Client Proposal — Zenith Bank', description: 'Draft a full service proposal for the Zenith Bank enterprise deal.', assignedTo: UID.tunde, assignedBy: UID.ceo, dueDate: T(daysAhead(2)), priority: 'high', status: 'in-review', createdAt: T(daysAgo(7)), tags: ['sales', 'proposal'] } },
  { id: 'task_009', data: { title: 'Fix Production Bug — Auth Module', description: 'Users intermittently get logged out on mobile. Investigate and patch.', assignedTo: UID.blessing, assignedBy: UID.oluwaseun, dueDate: T(daysAgo(1)), priority: 'high', status: 'completed', createdAt: T(daysAgo(4)), tags: ['engineering', 'bug'] } },
  { id: 'task_010', data: { title: 'Conduct Performance Reviews — Q2', description: 'Schedule and conduct 1:1 performance review sessions with all direct reports.', assignedTo: UID.chioma, assignedBy: UID.ceo, dueDate: T(daysAhead(10)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(1)), tags: ['hr', 'performance'] } },
  { id: 'task_011', data: { title: 'Upgrade Server Infrastructure', description: 'Migrate staging and production servers to the new tier. Zero-downtime deployment required.', assignedTo: UID.oluwaseun, assignedBy: UID.emeka, dueDate: T(daysAhead(21)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(2)), tags: ['engineering', 'infrastructure'] } },
  { id: 'task_012', data: { title: 'Reconcile June Accounts', description: 'Match all June bank statements against the ERP system and flag discrepancies.', assignedTo: UID.ibrahim, assignedBy: UID.fatima, dueDate: T(daysAhead(3)), priority: 'high', status: 'in-progress', createdAt: T(daysAgo(6)), tags: ['finance', 'reconciliation'] } },
  { id: 'task_013', data: { title: 'Customer Support SLA Review', description: 'Analyse ticket resolution times for June and prepare SLA compliance report.', assignedTo: UID.aisha, assignedBy: UID.emeka, dueDate: T(daysAhead(6)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(1)), tags: ['support', 'report'] } },
  { id: 'task_014', data: { title: 'Implement Dark Mode for Web App', description: 'Add dark/light theme toggle to the customer-facing web portal.', assignedTo: UID.blessing, assignedBy: UID.oluwaseun, dueDate: T(daysAhead(9)), priority: 'low', status: 'in-progress', createdAt: T(daysAgo(3)), tags: ['engineering', 'ui'] } },
  { id: 'task_015', data: { title: 'Office Equipment Inventory', description: 'Count and log all company assets (laptops, monitors, peripherals). Update the asset register.', assignedTo: UID.aminu, assignedBy: UID.emeka, dueDate: T(daysAhead(8)), priority: 'low', status: 'todo', createdAt: T(daysAgo(2)), tags: ['operations', 'assets'] } },
  { id: 'task_016', data: { title: 'Renew Business Insurance Policy', description: 'Review current policy terms, get at least two quotes, and submit renewal.', assignedTo: UID.emeka, assignedBy: UID.ceo, dueDate: T(daysAhead(15)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(1)), tags: ['operations', 'compliance'] } },
  { id: 'task_017', data: { title: 'Launch Email Newsletter Campaign', description: 'Design and send the July edition of the AE monthly newsletter to 4,200 subscribers.', assignedTo: UID.ngozi, assignedBy: UID.tunde, dueDate: T(daysAhead(12)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(1)), tags: ['marketing', 'email'] } },
  { id: 'task_018', data: { title: 'Negotiate Supplier Agreement — Dangote', description: 'Finalise terms for the new supply agreement with Dangote Cement. Target 15% cost reduction.', assignedTo: UID.tunde, assignedBy: UID.ceo, dueDate: T(daysAhead(18)), priority: 'high', status: 'todo', createdAt: T(daysAgo(0)), tags: ['sales', 'negotiation'] } },
  { id: 'task_019', data: { title: 'Staff Training: Cyber Security Basics', description: 'Organise and run a 2-hour cyber security awareness session for all staff.', assignedTo: UID.kayode, assignedBy: UID.chioma, dueDate: T(daysAhead(11)), priority: 'medium', status: 'todo', createdAt: T(daysAgo(1)), tags: ['hr', 'training'] } },
  { id: 'task_020', data: { title: 'Monthly Operations Report', description: 'Compile June operational KPIs across all departments into the executive dashboard.', assignedTo: UID.aminu, assignedBy: UID.ceo, dueDate: T(daysAhead(1)), priority: 'high', status: 'in-review', createdAt: T(daysAgo(8)), tags: ['operations', 'report'] } },
];

const messages = [
  { id: 'msg_001', data: { participants: [UID.ceo, UID.chioma], lastMessage: 'Please send me the updated onboarding checklist.', lastMessageAt: T(daysAgo(0)), unreadCount: 1, type: 'direct' } },
  { id: 'msg_002', data: { participants: [UID.ceo, UID.emeka], lastMessage: 'The vendor audit is almost done — should be in review by tomorrow.', lastMessageAt: T(daysAgo(1)), unreadCount: 0, type: 'direct' } },
  { id: 'msg_003', data: { participants: [UID.ceo, UID.fatima], lastMessage: 'June payroll is processed. Reports attached.', lastMessageAt: T(daysAgo(1)), unreadCount: 2, type: 'direct' } },
  { id: 'msg_004', data: { participants: [UID.ceo, UID.tunde], lastMessage: 'The Zenith Bank proposal is looking strong. Will share the draft tonight.', lastMessageAt: T(daysAgo(2)), unreadCount: 0, type: 'direct' } },
  { id: 'msg_005', data: { participants: [UID.ceo, UID.oluwaseun], lastMessage: 'v2.1 build passed QA. Deploying at 11 PM tonight.', lastMessageAt: T(daysAgo(2)), unreadCount: 1, type: 'direct' } },
  { id: 'msg_006', data: { participants: [UID.ceo, UID.ngozi], lastMessage: 'July social calendar sent over for your approval.', lastMessageAt: T(daysAgo(3)), unreadCount: 0, type: 'direct' } },
  { id: 'msg_007', data: { participants: [UID.ceo, UID.aisha], lastMessage: 'SLA report for June will be ready by Friday.', lastMessageAt: T(daysAgo(3)), unreadCount: 0, type: 'direct' } },
  { id: 'msg_008', data: { participants: [UID.ceo, UID.blessing], lastMessage: 'Auth bug patched and deployed. No more random logouts.', lastMessageAt: T(daysAgo(4)), unreadCount: 0, type: 'direct' } },
  { id: 'msg_009', data: { participants: [UID.ceo, UID.aminu], lastMessage: 'Operations report is 80% done. Just need the finance numbers.', lastMessageAt: T(daysAgo(5)), unreadCount: 1, type: 'direct' } },
  { id: 'msg_010', data: { participants: [UID.ceo, UID.ibrahim], lastMessage: 'June accounts reconciliation looks clean. Flagging two minor discrepancies.', lastMessageAt: T(daysAgo(5)), unreadCount: 0, type: 'direct' } },
  { id: 'msg_011', data: { participants: [UID.ceo, UID.chioma, UID.kayode], name: 'HR Team', lastMessage: 'Kayode: I\'ll handle the handbook updates. Chioma: performance reviews start Monday.', lastMessageAt: T(daysAgo(1)), unreadCount: 3, type: 'group' } },
  { id: 'msg_012', data: { participants: [UID.ceo, UID.emeka, UID.aminu], name: 'Operations', lastMessage: 'Aminu: equipment inventory 60% done. Emeka: good, finish by end of week.', lastMessageAt: T(daysAgo(2)), unreadCount: 0, type: 'group' } },
  { id: 'msg_013', data: { participants: [UID.ceo, UID.fatima, UID.ibrahim], name: 'Finance Team', lastMessage: 'Ibrahim: reconciliation almost done. Fatima: great — send it over when ready.', lastMessageAt: T(daysAgo(3)), unreadCount: 2, type: 'group' } },
  { id: 'msg_014', data: { participants: [UID.ceo, UID.oluwaseun, UID.blessing], name: 'Engineering', lastMessage: 'Next sprint planning is Thursday at 10 AM.', lastMessageAt: T(daysAgo(4)), unreadCount: 1, type: 'group' } },
  { id: 'msg_015', data: { participants: [UID.ceo, UID.tunde, UID.ngozi], name: 'Sales & Marketing', lastMessage: 'Tunde: let\'s sync on the Dangote pitch before Friday.', lastMessageAt: T(daysAgo(6)), unreadCount: 0, type: 'group' } },
];

type ThreadMsg = { convoId: string; msgId: string; senderId: string; text: string; sentAt: Date };

const threadMessages: ThreadMsg[] = [
  // msg_001: CEO ↔ Chioma
  { convoId:'msg_001', msgId:'t001_a', senderId:UID.chioma,    text:'Good morning! Can you send over the updated onboarding checklist? New hires join next week.', sentAt:minsAgo(122) },
  { convoId:'msg_001', msgId:'t001_b', senderId:UID.ceo,       text:'Please send me the updated onboarding checklist.',                                               sentAt:minsAgo(90)  },

  // msg_002: CEO ↔ Emeka
  { convoId:'msg_002', msgId:'t002_a', senderId:UID.emeka,     text:'Quick update on the vendor audit — we are going through the final supplier contracts now.',     sentAt:minsAgo(1502) },
  { convoId:'msg_002', msgId:'t002_b', senderId:UID.emeka,     text:'The vendor audit is almost done — should be in review by tomorrow.',                            sentAt:minsAgo(1440) },

  // msg_003: CEO ↔ Fatima
  { convoId:'msg_003', msgId:'t003_a', senderId:UID.ceo,       text:'Fatima, can you confirm if the June payroll run has been completed?',                           sentAt:minsAgo(1600) },
  { convoId:'msg_003', msgId:'t003_b', senderId:UID.fatima,    text:'June payroll is processed. Reports attached.',                                                   sentAt:minsAgo(1440) },

  // msg_004: CEO ↔ Tunde
  { convoId:'msg_004', msgId:'t004_a', senderId:UID.ceo,       text:'Tunde, how is the Zenith Bank proposal shaping up?',                                            sentAt:minsAgo(2902) },
  { convoId:'msg_004', msgId:'t004_b', senderId:UID.tunde,     text:'The Zenith Bank proposal is looking strong. Will share the draft tonight.',                     sentAt:minsAgo(2880) },

  // msg_005: CEO ↔ Oluwaseun
  { convoId:'msg_005', msgId:'t005_a', senderId:UID.oluwaseun, text:'Heads up — v2.1 is going through final QA checks now.',                                         sentAt:minsAgo(2902) },
  { convoId:'msg_005', msgId:'t005_b', senderId:UID.oluwaseun, text:'v2.1 build passed QA. Deploying at 11 PM tonight.',                                             sentAt:minsAgo(2880) },

  // msg_006: CEO ↔ Ngozi
  { convoId:'msg_006', msgId:'t006_a', senderId:UID.ngozi,     text:'I have drafted the July content calendar. Should I send it for your review?',                   sentAt:minsAgo(4322) },
  { convoId:'msg_006', msgId:'t006_b', senderId:UID.ngozi,     text:'July social calendar sent over for your approval.',                                              sentAt:minsAgo(4300) },

  // msg_007: CEO ↔ Aisha
  { convoId:'msg_007', msgId:'t007_a', senderId:UID.ceo,       text:'Aisha, the board needs the SLA numbers for Q2 — when can we expect the June report?',           sentAt:minsAgo(4402) },
  { convoId:'msg_007', msgId:'t007_b', senderId:UID.aisha,     text:'SLA report for June will be ready by Friday.',                                                   sentAt:minsAgo(4320) },

  // msg_008: CEO ↔ Blessing
  { convoId:'msg_008', msgId:'t008_a', senderId:UID.ceo,       text:'Blessing, there have been complaints about random session logouts. Is there a fix in progress?', sentAt:minsAgo(5802) },
  { convoId:'msg_008', msgId:'t008_b', senderId:UID.blessing,  text:'Auth bug patched and deployed. No more random logouts.',                                         sentAt:minsAgo(5760) },

  // msg_009: CEO ↔ Aminu
  { convoId:'msg_009', msgId:'t009_a', senderId:UID.ceo,       text:'Aminu, what is the status on the monthly operations report?',                                    sentAt:minsAgo(7302) },
  { convoId:'msg_009', msgId:'t009_b', senderId:UID.aminu,     text:'Operations report is 80% done. Just need the finance numbers.',                                  sentAt:minsAgo(7200) },

  // msg_010: CEO ↔ Ibrahim
  { convoId:'msg_010', msgId:'t010_a', senderId:UID.ibrahim,   text:'June accounts reconciliation is complete. Overall books are clean.',                             sentAt:minsAgo(7302) },
  { convoId:'msg_010', msgId:'t010_b', senderId:UID.ibrahim,   text:'June accounts reconciliation looks clean. Flagging two minor discrepancies.',                    sentAt:minsAgo(7200) },

  // msg_011: HR Team group
  { convoId:'msg_011', msgId:'t011_a', senderId:UID.chioma,    text:'Performance reviews start Monday. Everyone please prepare your self-assessments.',               sentAt:minsAgo(1502) },
  { convoId:'msg_011', msgId:'t011_b', senderId:UID.kayode,    text:"I'll handle the handbook updates. Chioma: performance reviews start Monday.",                    sentAt:minsAgo(1440) },

  // msg_012: Operations group
  { convoId:'msg_012', msgId:'t012_a', senderId:UID.emeka,     text:'Team, equipment inventory needs to be wrapped up by end of week. Where are we?',                sentAt:minsAgo(2902) },
  { convoId:'msg_012', msgId:'t012_b', senderId:UID.aminu,     text:'Aminu: inventory 60% done. E — I will finish by Friday.',                                       sentAt:minsAgo(2880) },

  // msg_013: Finance Team group
  { convoId:'msg_013', msgId:'t013_a', senderId:UID.fatima,    text:'Ibrahim, how far along is the June reconciliation?',                                            sentAt:minsAgo(4322) },
  { convoId:'msg_013', msgId:'t013_b', senderId:UID.ibrahim,   text:'Ibrahim: reconciliation almost done. Fatima: great — send it over when ready.',                 sentAt:minsAgo(4300) },

  // msg_014: Engineering group
  { convoId:'msg_014', msgId:'t014_a', senderId:UID.oluwaseun, text:'Reminder: sprint planning is this Thursday at 10 AM. Please review the backlog beforehand.',    sentAt:minsAgo(5802) },
  { convoId:'msg_014', msgId:'t014_b', senderId:UID.blessing,  text:'Next sprint planning is Thursday at 10 AM.',                                                    sentAt:minsAgo(5760) },

  // msg_015: Sales & Marketing group
  { convoId:'msg_015', msgId:'t015_a', senderId:UID.ngozi,     text:'Tunde, we need to align on the Dangote pitch strategy before Friday.',                          sentAt:minsAgo(8702) },
  { convoId:'msg_015', msgId:'t015_b', senderId:UID.tunde,     text:"Let's sync on the Dangote pitch before Friday.",                                                sentAt:minsAgo(8640) },
];

const clk = (h: number, m: number, d: Date) => {
  const dt = new Date(d); dt.setHours(h, m, 0, 0); return T(dt);
};
const timeTracking = [
  ...Array.from({ length: 30 }, (_, i) => {
    const day = daysAgo(i + 1);
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return null; // skip weekends
    const staffArr = [UID.chioma, UID.emeka, UID.fatima, UID.oluwaseun, UID.aminu, UID.ngozi, UID.tunde, UID.aisha, UID.kayode, UID.blessing];
    const staffId = staffArr[i % staffArr.length];
    const inH = 7 + Math.floor(Math.random() * 2); // 7–8 AM
    const inM = Math.floor(Math.random() * 30);
    const outH = 16 + Math.floor(Math.random() * 2); // 4–5 PM
    const outM = Math.floor(Math.random() * 60);
    const hoursWorked = parseFloat(((outH * 60 + outM - inH * 60 - inM) / 60).toFixed(1));
    return {
      id: `tt_${String(i + 1).padStart(3, '0')}`,
      data: {
        staffId, date: T(day),
        clockIn: clk(inH, inM, day), clockOut: clk(outH, outM, day),
        hoursWorked, notes: '',
        status: i < 20 ? 'approved' : 'pending',
      },
    };
  }).filter(Boolean),
];

const documents = [
  { id: 'doc_001', data: { title: 'Employee Handbook 2024', type: 'policy', uploadedBy: UID.chioma, uploadedAt: T(daysAgo(60)), fileUrl: 'https://placeholder.docs/handbook-2024.pdf', size: '2.4 MB', department: 'Human Resources', tags: ['hr', 'policy', 'handbook'] } },
  { id: 'doc_002', data: { title: 'Q1 Financial Report', type: 'report', uploadedBy: UID.fatima, uploadedAt: T(daysAgo(90)), fileUrl: 'https://placeholder.docs/q1-financial.pdf', size: '1.8 MB', department: 'Finance', tags: ['finance', 'q1', 'report'] } },
  { id: 'doc_003', data: { title: 'Service Agreement — Zenith Bank', type: 'contract', uploadedBy: UID.tunde, uploadedAt: T(daysAgo(45)), fileUrl: 'https://placeholder.docs/zenith-agreement.pdf', size: '890 KB', department: 'Sales', tags: ['sales', 'contract', 'zenith'] } },
  { id: 'doc_004', data: { title: 'Q2 Operations Review', type: 'report', uploadedBy: UID.emeka, uploadedAt: T(daysAgo(5)), fileUrl: 'https://placeholder.docs/q2-ops.pdf', size: '1.2 MB', department: 'Operations', tags: ['operations', 'q2', 'review'] } },
  { id: 'doc_005', data: { title: 'Remote Work Policy Update', type: 'policy', uploadedBy: UID.chioma, uploadedAt: T(daysAgo(14)), fileUrl: 'https://placeholder.docs/remote-policy.pdf', size: '450 KB', department: 'Human Resources', tags: ['hr', 'policy', 'remote'] } },
  { id: 'doc_006', data: { title: 'Board Meeting Minutes — June 2024', type: 'memo', uploadedBy: UID.ceo, uploadedAt: T(daysAgo(20)), fileUrl: 'https://placeholder.docs/board-june.pdf', size: '320 KB', department: 'Executive', tags: ['executive', 'board', 'minutes'] } },
  { id: 'doc_007', data: { title: 'IT Asset Register', type: 'report', uploadedBy: UID.aminu, uploadedAt: T(daysAgo(30)), fileUrl: 'https://placeholder.docs/asset-register.xlsx', size: '560 KB', department: 'Operations', tags: ['operations', 'assets', 'it'] } },
  { id: 'doc_008', data: { title: 'Marketing Strategy 2024', type: 'report', uploadedBy: UID.ngozi, uploadedAt: T(daysAgo(40)), fileUrl: 'https://placeholder.docs/marketing-strategy.pdf', size: '3.1 MB', department: 'Marketing', tags: ['marketing', 'strategy', '2024'] } },
  { id: 'doc_009', data: { title: 'Supplier Agreement — Dangote', type: 'contract', uploadedBy: UID.tunde, uploadedAt: T(daysAgo(7)), fileUrl: 'https://placeholder.docs/dangote-agreement.pdf', size: '1.1 MB', department: 'Sales', tags: ['sales', 'contract', 'dangote'] } },
  { id: 'doc_010', data: { title: 'June Payroll Summary', type: 'report', uploadedBy: UID.fatima, uploadedAt: T(daysAgo(2)), fileUrl: 'https://placeholder.docs/payroll-june.xlsx', size: '240 KB', department: 'Finance', tags: ['finance', 'payroll', 'june'] } },
];

const leaveRequests = [
  { id: 'lr_001', data: { staffId: UID.chioma, staffName: 'Chioma Okafor', leaveType: 'annual', startDate: T(daysAhead(10)), endDate: T(daysAhead(17)), daysRequested: 7, reason: 'Family vacation planned for July.', status: 'pending', reviewedBy: null, reviewedAt: null } },
  { id: 'lr_002', data: { staffId: UID.oluwaseun, staffName: 'Oluwaseun Adeyemi', leaveType: 'sick', startDate: T(daysAgo(3)), endDate: T(daysAgo(1)), daysRequested: 2, reason: 'Fever and flu. Doctor\'s note attached.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(3)) } },
  { id: 'lr_003', data: { staffId: UID.ngozi, staffName: 'Ngozi Eze', leaveType: 'annual', startDate: T(daysAhead(20)), endDate: T(daysAhead(24)), daysRequested: 5, reason: 'Personal travel.', status: 'pending', reviewedBy: null, reviewedAt: null } },
  { id: 'lr_004', data: { staffId: UID.tunde, staffName: 'Tunde Bakare', leaveType: 'sick', startDate: T(daysAgo(10)), endDate: T(daysAgo(9)), daysRequested: 1, reason: 'Medical appointment.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(10)) } },
  { id: 'lr_005', data: { staffId: UID.emeka, staffName: 'Emeka Nwosu', leaveType: 'annual', startDate: T(daysAhead(30)), endDate: T(daysAhead(40)), daysRequested: 10, reason: 'Annual family leave.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(5)) } },
  { id: 'lr_006', data: { staffId: UID.aisha, staffName: 'Aisha Yusuf', leaveType: 'unpaid', startDate: T(daysAgo(15)), endDate: T(daysAgo(13)), daysRequested: 2, reason: 'Personal emergency.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(16)) } },
  { id: 'lr_007', data: { staffId: UID.kayode, staffName: 'Kayode Olatunji', leaveType: 'annual', startDate: T(daysAhead(50)), endDate: T(daysAhead(57)), daysRequested: 7, reason: 'Planned vacation.', status: 'pending', reviewedBy: null, reviewedAt: null } },
  { id: 'lr_008', data: { staffId: UID.fatima, staffName: 'Fatima Abubakar', leaveType: 'sick', startDate: T(daysAgo(20)), endDate: T(daysAgo(20)), daysRequested: 1, reason: 'Migraine.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(20)) } },
  { id: 'lr_009', data: { staffId: UID.blessing, staffName: 'Blessing Nkem', leaveType: 'annual', startDate: T(daysAhead(15)), endDate: T(daysAhead(16)), daysRequested: 2, reason: 'Wedding attendance.', status: 'pending', reviewedBy: null, reviewedAt: null } },
  { id: 'lr_010', data: { staffId: UID.aminu, staffName: 'Aminu Suleiman', leaveType: 'annual', startDate: T(daysAgo(30)), endDate: T(daysAgo(25)), daysRequested: 5, reason: 'Annual leave.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(31)) } },
  { id: 'lr_011', data: { staffId: UID.ibrahim, staffName: 'Ibrahim Musa', leaveType: 'sick', startDate: T(daysAgo(7)), endDate: T(daysAgo(5)), daysRequested: 3, reason: 'Illness — malaria.', status: 'rejected', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(7)) } },
  { id: 'lr_012', data: { staffId: UID.chioma, staffName: 'Chioma Okafor', leaveType: 'maternity', startDate: T(daysAhead(60)), endDate: T(daysAhead(150)), daysRequested: 90, reason: 'Maternity leave.', status: 'pending', reviewedBy: null, reviewedAt: null } },
  { id: 'lr_013', data: { staffId: UID.ngozi, staffName: 'Ngozi Eze', leaveType: 'sick', startDate: T(daysAgo(45)), endDate: T(daysAgo(44)), daysRequested: 1, reason: 'Stomach bug.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(45)) } },
  { id: 'lr_014', data: { staffId: UID.oluwaseun, staffName: 'Oluwaseun Adeyemi', leaveType: 'annual', startDate: T(daysAhead(35)), endDate: T(daysAhead(37)), daysRequested: 3, reason: 'Holiday travel.', status: 'pending', reviewedBy: null, reviewedAt: null } },
  { id: 'lr_015', data: { staffId: UID.tunde, staffName: 'Tunde Bakare', leaveType: 'annual', startDate: T(daysAgo(60)), endDate: T(daysAgo(55)), daysRequested: 5, reason: 'Annual vacation.', status: 'approved', reviewedBy: UID.ceo, reviewedAt: T(daysAgo(61)) } },
];

const payments = [
  ...['chioma', 'emeka', 'fatima', 'oluwaseun', 'aminu', 'ngozi', 'tunde', 'aisha', 'kayode', 'blessing'].map((key, i) => ({
    id: `pay_salary_june_${String(i + 1).padStart(2, '0')}`,
    data: {
      staffId: UID[key as keyof typeof UID], staffName: users.find(u => u.id === UID[key as keyof typeof UID])?.data.name,
      amount: salaryFor(users.find(u => u.id === UID[key as keyof typeof UID])?.data.role as string),
      type: 'salary', date: T(new Date('2024-06-28')),
      status: 'paid', reference: `SAL-JUN-${String(i + 1).padStart(3, '0')}`,
      description: 'June 2024 salary payment',
    },
  })),
  { id: 'pay_bonus_001', data: { staffId: UID.tunde, staffName: 'Tunde Bakare', amount: 150000, type: 'bonus', date: T(new Date('2024-06-15')), status: 'paid', reference: 'BON-Q2-001', description: 'Q2 sales performance bonus' } },
  { id: 'pay_bonus_002', data: { staffId: UID.oluwaseun, staffName: 'Oluwaseun Adeyemi', amount: 80000, type: 'bonus', date: T(new Date('2024-06-15')), status: 'paid', reference: 'BON-Q2-002', description: 'Q2 engineering milestone bonus' } },
  { id: 'pay_reimb_001', data: { staffId: UID.emeka, staffName: 'Emeka Nwosu', amount: 45000, type: 'reimbursement', date: T(daysAgo(5)), status: 'pending', reference: 'REIMB-2024-001', description: 'Lagos–Abuja travel expenses for vendor meeting' } },
  { id: 'pay_reimb_002', data: { staffId: UID.chioma, staffName: 'Chioma Okafor', amount: 12500, type: 'reimbursement', date: T(daysAgo(10)), status: 'paid', reference: 'REIMB-2024-002', description: 'Training materials reimbursement' } },
  { id: 'pay_salary_may_001', data: { staffId: UID.fatima, staffName: 'Fatima Abubakar', amount: 350000, type: 'salary', date: T(new Date('2024-05-31')), status: 'paid', reference: 'SAL-MAY-003', description: 'May 2024 salary payment' } },
  { id: 'pay_failed_001', data: { staffId: UID.ibrahim, staffName: 'Ibrahim Musa', amount: 0, type: 'salary', date: T(new Date('2024-06-28')), status: 'failed', reference: 'SAL-JUN-012', description: 'June 2024 salary — account details invalid (contract)' } },
  { id: 'pay_reimb_003', data: { staffId: UID.aisha, staffName: 'Aisha Yusuf', amount: 8000, type: 'reimbursement', date: T(daysAgo(3)), status: 'pending', reference: 'REIMB-2024-003', description: 'Internet subscription — June' } },
];

const notifications = [
  { id: 'notif_001', data: { recipientId: UID.ceo, type: 'task_assigned', message: 'Fatima Abubakar has submitted the Q2 Financial Report for review.', read: false, createdAt: T(daysAgo(0)), relatedTo: { collection: 'tasks', docId: 'task_001' } } },
  { id: 'notif_002', data: { recipientId: UID.ceo, type: 'leave_approved', message: 'Leave request from Chioma Okafor is pending your approval.', read: false, createdAt: T(daysAgo(1)), relatedTo: { collection: 'leaveRequests', docId: 'lr_001' } } },
  { id: 'notif_003', data: { recipientId: UID.ceo, type: 'payment_processed', message: 'June payroll of ₦3,540,000 has been processed successfully.', read: true, createdAt: T(daysAgo(2)), relatedTo: { collection: 'payments', docId: 'pay_salary_june_01' } } },
  { id: 'notif_004', data: { recipientId: UID.ceo, type: 'task_assigned', message: 'Tunde Bakare submitted the Zenith Bank proposal for your review.', read: false, createdAt: T(daysAgo(1)), relatedTo: { collection: 'tasks', docId: 'task_008' } } },
  { id: 'notif_005', data: { recipientId: UID.ceo, type: 'announcement', message: 'New company announcement: Q3 Planning Workshop — save the date.', read: true, createdAt: T(daysAgo(3)), relatedTo: { collection: 'announcements', docId: 'ann_001' } } },
  { id: 'notif_006', data: { recipientId: UID.ceo, type: 'payment_processed', message: 'Reimbursement request from Emeka Nwosu (₦45,000) is pending approval.', read: false, createdAt: T(daysAgo(4)), relatedTo: { collection: 'payments', docId: 'pay_reimb_001' } } },
  { id: 'notif_007', data: { recipientId: UID.ceo, type: 'task_assigned', message: 'Oluwaseun Adeyemi: Mobile App v2.1 deployed to production.', read: true, createdAt: T(daysAgo(5)), relatedTo: { collection: 'tasks', docId: 'task_005' } } },
  { id: 'notif_008', data: { recipientId: UID.ceo, type: 'leave_approved', message: 'Ngozi Eze submitted an annual leave request (5 days) for review.', read: false, createdAt: T(daysAgo(2)), relatedTo: { collection: 'leaveRequests', docId: 'lr_003' } } },
  { id: 'notif_009', data: { recipientId: UID.ceo, type: 'task_assigned', message: 'Aminu Suleiman: Monthly Operations Report is ready for review.', read: true, createdAt: T(daysAgo(6)), relatedTo: { collection: 'tasks', docId: 'task_020' } } },
  { id: 'notif_010', data: { recipientId: UID.ceo, type: 'payment_processed', message: 'Payment failed for Ibrahim Musa — invalid account details.', read: false, createdAt: T(daysAgo(3)), relatedTo: { collection: 'payments', docId: 'pay_failed_001' } } },
];

const announcements = [
  { id: 'ann_001', data: { title: 'Q3 Planning Workshop — Save the Date', body: 'The Q3 strategic planning workshop will be held on July 15th at the Lagos head office. All department heads must attend. Lunch will be provided.', postedBy: UID.ceo, postedAt: T(daysAgo(3)), priority: 'normal', audienceRoles: ['ceo', 'manager', 'hr', 'finance', 'opm'] } },
  { id: 'ann_002', data: { title: 'Updated Remote Work Policy', body: 'Effective August 1st, all staff are required to be in the office at least 3 days per week. The updated policy document has been uploaded to the documents portal.', postedBy: UID.chioma, postedAt: T(daysAgo(14)), priority: 'normal', audienceRoles: ['ceo', 'manager', 'hr', 'finance', 'opm', 'staff'] } },
  { id: 'ann_003', data: { title: 'URGENT: System Maintenance Tonight', body: 'The AE Workstation platform will be down for scheduled maintenance from 11 PM to 2 AM tonight (Friday). Please save all work before 10:45 PM.', postedBy: UID.ceo, postedAt: T(daysAgo(1)), priority: 'urgent', audienceRoles: ['ceo', 'manager', 'hr', 'finance', 'opm', 'staff'] } },
  { id: 'ann_004', data: { title: 'New Staff Parking Allocation', body: 'Parking bays have been reassigned for Q3. Please collect your new parking permit from the Operations desk by Friday. Unclaimed permits will be forfeited.', postedBy: UID.aminu, postedAt: T(daysAgo(7)), priority: 'normal', audienceRoles: ['ceo', 'manager', 'hr', 'finance', 'opm', 'staff'] } },
  { id: 'ann_005', data: { title: 'Welcome — New Team Members!', body: 'Please join us in welcoming Blessing Nkem (Engineering) and Ibrahim Musa (Finance) to the Agunwami Enterprise family. Their first day is today — do reach out and say hello!', postedBy: UID.chioma, postedAt: T(daysAgo(30)), priority: 'normal', audienceRoles: ['ceo', 'manager', 'hr', 'finance', 'opm', 'staff'] } },
];

const training = [
  { id: 'trn_001', data: { title: 'Cyber Security Fundamentals', description: 'Essential cyber security awareness for all staff — phishing, password hygiene, and safe browsing.', assignedTo: Object.values(UID), dueDate: T(daysAhead(11)), status: 'not-started', completionRate: 0, category: 'Security', isMandatory: true, materials: ['https://placeholder.docs/cybersec-slides.pdf'] } },
  { id: 'trn_002', data: { title: 'Leadership Excellence Programme', description: '3-week intensive leadership course for managers and senior staff.', assignedTo: [UID.ceo, UID.emeka, UID.tunde, UID.chioma], dueDate: T(daysAhead(30)), status: 'in-progress', completionRate: 45, category: 'Leadership', isMandatory: false, materials: ['https://placeholder.docs/leadership-module1.pdf', 'https://placeholder.docs/leadership-module2.pdf'] } },
  { id: 'trn_003', data: { title: 'Financial Reporting Standards (IFRS)', description: 'Updated IFRS training for finance team members.', assignedTo: [UID.fatima, UID.ibrahim], dueDate: T(daysAhead(21)), status: 'in-progress', completionRate: 60, category: 'Finance', isMandatory: true, materials: ['https://placeholder.docs/ifrs-2024.pdf'] } },
  { id: 'trn_004', data: { title: 'Data Privacy & NDPR Compliance', description: 'Nigeria Data Protection Regulation compliance training — mandatory for all departments handling customer data.', assignedTo: [UID.ceo, UID.chioma, UID.kayode, UID.fatima, UID.oluwaseun, UID.blessing], dueDate: T(daysAgo(5)), status: 'in-progress', completionRate: 80, category: 'Compliance', isMandatory: true, materials: ['https://placeholder.docs/ndpr-guide.pdf'] } },
  { id: 'trn_005', data: { title: 'Advanced Excel for Finance', description: 'Pivot tables, Power Query, and financial modelling in Excel.', assignedTo: [UID.fatima, UID.ibrahim, UID.aminu], dueDate: T(daysAhead(14)), status: 'not-started', completionRate: 0, category: 'Finance', isMandatory: false, materials: [] } },
  { id: 'trn_006', data: { title: 'Customer Service Excellence', description: 'Best practices in customer communication, complaint handling, and SLA management.', assignedTo: [UID.aisha, UID.ngozi, UID.tunde], dueDate: T(daysAhead(7)), status: 'completed', completionRate: 100, category: 'Customer Service', isMandatory: false, materials: ['https://placeholder.docs/cse-workbook.pdf'] } },
  { id: 'trn_007', data: { title: 'React & Next.js for the Engineering Team', description: 'Modern front-end development with React 19 and Next.js 16.', assignedTo: [UID.oluwaseun, UID.blessing], dueDate: T(daysAhead(45)), status: 'in-progress', completionRate: 30, category: 'Engineering', isMandatory: false, materials: ['https://placeholder.docs/react-nextjs-course.zip'] } },
  { id: 'trn_008', data: { title: 'Health & Safety in the Workplace', description: 'Fire safety, first aid basics, and workplace ergonomics.', assignedTo: Object.values(UID), dueDate: T(daysAgo(10)), status: 'completed', completionRate: 100, category: 'Health & Safety', isMandatory: true, materials: ['https://placeholder.docs/hs-handbook.pdf'] } },
];

const analytics = {
  staffOverview: {
    id: 'staffOverview',
    data: {
      totalStaff: 12, activeStaff: 11, newThisMonth: 1,
      byDepartment: { Engineering: 2, Finance: 2, 'Human Resources': 2, Marketing: 1, Operations: 2, Sales: 1, Support: 1, Executive: 1 },
      byRole: { ceo: 1, hr: 2, manager: 2, finance: 2, opm: 1, staff: 4 },
    },
  },
  taskSummary: {
    id: 'taskSummary',
    data: {
      total: 20,
      byStatus: { todo: 9, 'in-progress': 5, 'in-review': 3, completed: 3 },
      completedThisMonth: 3,
      overdueCount: 2,
    },
  },
  leaveOverview: {
    id: 'leaveOverview',
    data: {
      pendingRequests: 6,
      approvedThisMonth: 6,
      byType: { annual: 9, sick: 5, unpaid: 1, maternity: 1 },
    },
  },
  paymentSummary: {
    id: 'paymentSummary',
    data: {
      totalPaidThisMonth: 4_245_000,
      pendingPayments: 3,
      monthlyTotals: [
        { month: 'Feb', total: 3_540_000 },
        { month: 'Mar', total: 3_620_000 },
        { month: 'Apr', total: 3_720_000 },
        { month: 'May', total: 3_890_000 },
        { month: 'Jun', total: 4_245_000 },
        { month: 'Jul', total: 0 },
      ],
    },
  },
  attendanceSummary: {
    id: 'attendanceSummary',
    data: {
      averageHoursThisWeek: 38.5,
      lateArrivals: 3,
      onTimePercentage: 94,
      dailyHours: [
        { day: 'Mon', hours: 8.2 },
        { day: 'Tue', hours: 7.9 },
        { day: 'Wed', hours: 8.5 },
        { day: 'Thu', hours: 8.1 },
        { day: 'Fri', hours: 7.5 },
        { day: 'Sat', hours: 0 },
        { day: 'Sun', hours: 0 },
      ],
    },
  },
};

// ─── SEED THREAD MESSAGES ─────────────────────────────────────────────────────

async function seedMessageThreads(): Promise<void> {
  let written = 0;
  let skipped = 0;
  for (const msg of threadMessages) {
    const ref = db.collection('messages').doc(msg.convoId).collection('thread').doc(msg.msgId);
    const existing = await ref.get();
    if (existing.exists) { skipped++; continue; }
    await ref.set({ senderId: msg.senderId, text: msg.text, sentAt: Timestamp.fromDate(msg.sentAt) });
    written++;
  }
  if (written > 0) console.log(`  ✅ message threads — ${written} messages written`);
  if (skipped > 0) console.log(`  ⏭  message threads — ${skipped} messages already exist, skipped`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  AE Workstation — Firestore Seed');
  console.log('─'.repeat(44));

  await seedCollection('users', users);
  await seedCollection('staff', staff);
  await seedCollection('tasks', tasks);
  await seedCollection('messages', messages);
  await seedMessageThreads();
  await seedCollection('timeTracking', timeTracking.filter((r): r is NonNullable<typeof r> => r !== null));
  await seedCollection('documents', documents);
  await seedCollection('leaveRequests', leaveRequests);
  await seedCollection('payments', payments);
  await seedCollection('notifications', notifications);
  await seedCollection('announcements', announcements);
  await seedCollection('training', training);

  // Analytics — individual named documents inside /analytics collection
  const analyticsCol = db.collection('analytics');
  const existingAnalytics = await analyticsCol.limit(1).get();
  if (existingAnalytics.empty) {
    const batch = db.batch();
    for (const [, { id, data }] of Object.entries(analytics)) {
      batch.set(analyticsCol.doc(id), data);
    }
    await batch.commit();
    console.log(`  ✅ analytics — 5 summary documents written`);
  } else {
    console.log(`  ⏭  analytics already seeded — skipping`);
  }

  console.log('\n🎉  Seed complete!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
