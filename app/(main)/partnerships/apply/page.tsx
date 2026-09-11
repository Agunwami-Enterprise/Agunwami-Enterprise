"use client";

import { useState } from "react";
import Link from "next/link";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import Badge from "@/app/components/common/ui/Badge";
import Section from "@/app/components/common/ui/Section";
import { cn } from "@/lib/utils";
import {
  RiUserLine,
  RiBuilding4Line,
  RiFolderLine,
  RiErrorWarningLine,
  RiStackLine,
  RiShieldCheckLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiArrowDownSLine,
  RiCodeLine,
  RiWindowLine,
  RiPencilRuler2Line,
  RiGitBranchLine,
  RiGitMergeLine,
  RiBarChartLine,
  RiShoppingCart2Line,
  RiGroupLine,
  RiMoreLine,
} from "react-icons/ri";
import { BiDollar } from "react-icons/bi";

/* -----------------------------------------------------------------------
   TYPES
----------------------------------------------------------------------- */

type Step = { id: number; label: string; icon: React.ElementType };

type FormData = {
  // Step 1
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  role: string;
  // Step 2
  orgName: string;
  orgType: string;
  industry: string;
  orgSize: string;
  website: string;
  location: string;
  yearsInOperation: string;
  // Step 3
  helpNeeded: string[];
  projectDescription: string;
  // Step 4
  challenges: string[];
  desiredOutcome: string;
  currentSolutionType: string;
  // Step 5
  services: string[];
  additionalNotes: string;
  // Step 6
  budgetRange: string;
  startTime: string;
  deadline: string;
  decisionMakers: string;
  otherStakeholders: string;
};

/* -----------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------- */

const STEPS: Step[] = [
  { id: 1, label: "About You", icon: RiUserLine },
  { id: 2, label: "Organization", icon: RiBuilding4Line },
  { id: 3, label: "Project", icon: RiFolderLine },
  { id: 4, label: "Challenge", icon: RiErrorWarningLine },
  { id: 5, label: "Services", icon: RiStackLine },
  { id: 6, label: "Budget", icon: BiDollar },
];

// Step 1
const ROLES = [
  "CEO/Founder",
  "Director/Manager",
  "Decision Maker",
  "Project Lead",
  "Evaluating Options",
  "Other",
];

// Step 2
const ORG_TYPES = [
  "Nonprofit / NGO",
  "Educational Institution",
  "Startup",
  "Technology Company",
  "Government Agency",
  "Social Enterprise",
  "Other",
];
const INDUSTRIES = [
  "Education & EdTech",
  "Healthcare & MedTech",
  "Nonprofit & Social Impact",
  "Finance & FinTech",
  "Retail & E-Commerce",
  "Government & Public Sector",
  "Media & Entertainment",
  "Agriculture & AgriTech",
  "Other",
];
const ORG_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const YEARS_IN_OP = [
  "Less than 1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

// Step 3
const HELP_NEEDED = [
  { label: "Website Development", icon: RiCodeLine },
  { label: "Platform / App Build", icon: RiWindowLine },
  { label: "UI/UX Design", icon: RiPencilRuler2Line },
  { label: "System Integration", icon: RiGitBranchLine },
  { label: "API Integration", icon: RiGitMergeLine },
  { label: "Digital Infrastructure", icon: RiStackLine },
  { label: "Consulting & Strategy", icon: RiBarChartLine },
  { label: "E-Commerce Solution", icon: RiShoppingCart2Line },
  { label: "Membership Platform", icon: RiGroupLine },
  { label: "Other", icon: RiMoreLine },
];

// Step 4
const CHALLENGES = [
  "No clear digital presence",
  "Outdated or slow platform",
  "Poor user experience",
  "Scaling difficulties",
  "Lack of integrations",
  "No automation",
  "Budget constraints",
  "No technical team",
  "Starting from scratch",
  "Other",
];
const CURRENT_SOLUTIONS = [
  "No, starting fresh",
  "Yes, a website",
  "Yes, an app or platform",
  "Yes, a manual process",
  "Yes, but it doesn't work well",
  "Not sure",
];

// Step 5
const SERVICES_LIST = [
  "Platform Architecture & Development",
  "Web Application Development",
  "Mobile App Development",
  "Admin Dashboard & Internal Tools",
  "Membership & CRM Systems",
  "E-Commerce & Payment Integration",
  "Workflow Automation",
  "Data Analytics & Reporting",
  "API Development & Integration",
  "Technical Consulting & Strategy",
  "Ongoing Maintenance & Support",
  "Other",
];

// Step 6
const BUDGET_RANGES = [
  "Under $5,000",
  "$5,000 to $15,000",
  "$15,000 to $50,000",
  "$50,000 to $100,000",
  "Over $100,000",
  "I'm flexible",
  "Not sure yet / open to discussion",
];

const START_TIMES = [
  "Immediately",
  "Within 1 month",
  "1 to 3 months",
  "Just exploring for now",
];

const DECISION_MAKERS = [
  "Just me",
  "Me and my co-founder",
  "Me and my board",
  "Me and my technical team",
  "Me and external stakeholders",
  "Multiple departments",
];

const INITIAL: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  linkedin: "",
  role: "",
  orgName: "",
  orgType: "",
  industry: "",
  orgSize: "",
  website: "",
  location: "",
  yearsInOperation: "",
  helpNeeded: [],
  projectDescription: "",
  challenges: [],
  desiredOutcome: "",
  currentSolutionType: "",
  services: [],
  additionalNotes: "",
  budgetRange: "",
  startTime: "",
  deadline: "",
  decisionMakers: "",
  otherStakeholders: "",
};

/* -----------------------------------------------------------------------
   SHARED UI HELPERS
----------------------------------------------------------------------- */

function Label({
  children,
  required,
  sub,
}: {
  children: React.ReactNode;
  required?: boolean;
  sub?: string;
}) {
  return (
    <div className="mb-2">
      <label className="block text-[11px] font-bold tracking-[0.15em] text-gray-700 dark:text-gray-300 uppercase">
        {children}
        {required && <span className="text-primary ml-1">*</span>}
      </label>
      {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  id,
  cream,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  id?: string;
  cream?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full px-4 py-3 rounded-xl border-0 text-gray-900 dark:text-white placeholder:text-gray-400 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition",
        cream ? "bg-[#F5F0E8] dark:bg-white/5" : "bg-gray-100 dark:bg-white/10",
      )}
    />
  );
}

function Textarea({
  placeholder,
  value,
  onChange,
  rows = 4,
  cream,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  cream?: boolean;
}) {
  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full px-4 py-3 rounded-xl border-0 text-gray-900 dark:text-white placeholder:text-gray-400 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none",
        cream ? "bg-[#F5F0E8] dark:bg-white/5" : "bg-gray-100 dark:bg-white/10",
      )}
    />
  );
}

function SelectField({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 pr-10 rounded-xl border-0 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white text-[15px] focus:outline-none appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <RiArrowDownSLine className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none" />
    </div>
  );
}

/**
 * ChipButton component with rounded-xl corners (not oval) and gold selected state
 * with RiCheckboxCircleLine icon when active.
 */
function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium border transition-all duration-200 cursor-pointer text-left whitespace-nowrap",
        selected
          ? "bg-primary text-white border-primary shadow-sm"
          : "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-primary/50",
      )}
    >
      {selected && (
        <RiCheckboxCircleLine className="text-[17px] text-white shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}

/* -----------------------------------------------------------------------
   STEP 1 — About You
----------------------------------------------------------------------- */
function StepAboutYou({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] md:text-[28px] font-primary font-semibold text-gray-900 dark:text-white">
          Tell us about yourself
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          This helps us understand who we are speaking with
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>First Name</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={data.firstName}
            onChange={(v) => set("firstName", v)}
          />
        </div>
        <div>
          <Label required>Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={data.lastName}
            onChange={(v) => set("lastName", v)}
          />
        </div>
        <div>
          <Label required>Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@email.com"
            value={data.email}
            onChange={(v) => set("email", v)}
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 800 000 0000"
            value={data.phone}
            onChange={(v) => set("phone", v)}
          />
        </div>
      </div>
      <div>
        <Label>LinkedIn Profile</Label>
        <Input
          id="linkedin"
          placeholder="https://linkedin.com/in/..."
          value={data.linkedin}
          onChange={(v) => set("linkedin", v)}
        />
      </div>
      <div>
        <Label required>What is your role?</Label>
        <div className="flex flex-wrap gap-2.5">
          {ROLES.map((r) => (
            <ChipButton
              key={r}
              label={r}
              selected={data.role === r}
              onClick={() => set("role", r)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   STEP 2 — Your Organization
----------------------------------------------------------------------- */
function StepOrganization({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] md:text-[28px] font-primary font-semibold text-gray-900 dark:text-white">
          Your Organization
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          Help us understand the context you are building in.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Organization Name</Label>
          <Input
            id="orgName"
            placeholder="Acme Nonprofit, Inc."
            value={data.orgName}
            onChange={(v) => set("orgName", v)}
          />
        </div>
        <div>
          <Label required>Organization Type</Label>
          <SelectField
            options={ORG_TYPES}
            value={data.orgType}
            onChange={(v) => set("orgType", v)}
            placeholder="Select type"
          />
        </div>
        <div>
          <Label required>Industry / Sector</Label>
          <SelectField
            options={INDUSTRIES}
            value={data.industry}
            onChange={(v) => set("industry", v)}
            placeholder="Select industry"
          />
        </div>
        <div>
          <Label>Organization Size</Label>
          <SelectField
            options={ORG_SIZES}
            value={data.orgSize}
            onChange={(v) => set("orgSize", v)}
            placeholder="Select size"
          />
        </div>
        <div>
          <Label>Website</Label>
          <Input
            id="website"
            placeholder="https://yourorg.com"
            value={data.website}
            onChange={(v) => set("website", v)}
          />
        </div>
        <div>
          <Label>Location / Headquarters</Label>
          <Input
            id="location"
            placeholder="Atlanta, GA"
            value={data.location}
            onChange={(v) => set("location", v)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Years in Operation</Label>
          <SelectField
            options={YEARS_IN_OP}
            value={data.yearsInOperation}
            onChange={(v) => set("yearsInOperation", v)}
            placeholder="Select range"
          />
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   STEP 3 — What are you looking to build?
----------------------------------------------------------------------- */
function StepProject({
  data,
  setField,
}: {
  data: FormData;
  setField: (k: keyof FormData, v: string | string[]) => void;
}) {
  const toggle = (item: string) => {
    const next = data.helpNeeded.includes(item)
      ? data.helpNeeded.filter((s) => s !== item)
      : [...data.helpNeeded, item];
    setField("helpNeeded", next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] md:text-[28px] font-primary font-semibold text-gray-900 dark:text-white">
          What are you looking to build?
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          Tell us what you need and what you are trying to accomplish.
        </p>
      </div>

      <div>
        <Label>What do you need help with?</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
          {HELP_NEEDED.map(({ label, icon: Icon }) => {
            const active = data.helpNeeded.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
                className={cn(
                  "flex flex-col gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                  label === "Other" && "col-span-2 sm:col-span-3",
                  active
                    ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20",
                )}
              >
                <Icon className="text-[22px]" />
                <span className="text-[13px] font-medium leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label required>What are you trying to build, improve, or solve?</Label>
        <Textarea
          cream
          rows={5}
          placeholder="Tell us about your project, the problem you're trying to solve, and what you'd like the final solution to achieve."
          value={data.projectDescription}
          onChange={(v) => setField("projectDescription", v)}
        />
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   STEP 4 — Tell us about your situation
----------------------------------------------------------------------- */
function StepSituation({
  data,
  set,
  setField,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  setField: (k: keyof FormData, v: string | string[]) => void;
}) {
  const toggleChallenge = (c: string) => {
    const next = data.challenges.includes(c)
      ? data.challenges.filter((x) => x !== c)
      : [...data.challenges, c];
    setField("challenges", next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] md:text-[28px] font-primary font-semibold text-gray-900 dark:text-white">
          Tell us about your situation.
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          Understanding your current challenges helps us prepare the right
          solution.
        </p>
      </div>

      <div>
        <Label>What is the main challenge you are currently facing?</Label>
        <div className="flex flex-wrap gap-2.5 mt-1">
          {CHALLENGES.map((c) => (
            <ChipButton
              key={c}
              label={c}
              selected={data.challenges.includes(c)}
              onClick={() => toggleChallenge(c)}
            />
          ))}
        </div>
      </div>

      <div>
        <Label sub="What would success look like?">
          What would you like this project to accomplish?
        </Label>
        <Textarea
          cream
          rows={4}
          placeholder="Describe what a successful outcome looks like for you."
          value={data.desiredOutcome}
          onChange={(v) => set("desiredOutcome", v)}
        />
      </div>

      <div>
        <Label>Do you currently have a solution in place?</Label>
        <div className="flex flex-wrap gap-2.5 mt-1">
          {CURRENT_SOLUTIONS.map((s) => (
            <ChipButton
              key={s}
              label={s}
              selected={data.currentSolutionType === s}
              onClick={() => set("currentSolutionType", s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   STEP 5 — Services & Scope
----------------------------------------------------------------------- */
function StepServices({
  data,
  setField,
}: {
  data: FormData;
  setField: (k: keyof FormData, v: string | string[]) => void;
}) {
  const toggle = (s: string) => {
    const next = data.services.includes(s)
      ? data.services.filter((x) => x !== s)
      : [...data.services, s];
    setField("services", next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] md:text-[28px] font-primary font-semibold text-gray-900 dark:text-white">
          Services & Scope
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          Select the specific services you are looking for.
        </p>
      </div>

      <div>
        <Label>What services do you need?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
          {SERVICES_LIST.map((service) => {
            const checked = data.services.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggle(service)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-left hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 cursor-pointer"
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                    checked
                      ? "bg-primary border-primary"
                      : "border-gray-300 dark:border-white/30",
                  )}
                >
                  {checked && (
                    <RiCheckLine className="text-white text-[10px]" />
                  )}
                </div>
                <span className="text-[13px] text-gray-700 dark:text-gray-300">
                  {service}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea
          cream
          rows={4}
          placeholder="Any other context, requirements, or questions about services?"
          value={data.additionalNotes}
          onChange={(v) => setField("additionalNotes", v)}
        />
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   STEP 6 — Budget, timing, and who's involved
----------------------------------------------------------------------- */
function StepBudget({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[22px] md:text-[28px] font-primary font-semibold text-gray-900 dark:text-white">
          Budget, timing, and who&apos;s involved.
        </h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          This helps us prepare a response that is realistic and relevant.
        </p>
      </div>

      {/* Question 1: Budget Range */}
      <div>
        <Label>DO YOU HAVE AN ESTIMATED BUDGET RANGE FOR THIS PROJECT?</Label>
        <div className="flex flex-wrap gap-2.5 mt-1.5">
          {BUDGET_RANGES.map((range) => (
            <ChipButton
              key={range}
              label={range}
              selected={data.budgetRange === range}
              onClick={() => set("budgetRange", range)}
            />
          ))}
        </div>
      </div>

      {/* Question 2: Start Time */}
      <div>
        <Label>WHEN WOULD YOU LIKE TO START?</Label>
        <div className="flex flex-wrap gap-2.5 mt-1.5">
          {START_TIMES.map((time) => (
            <ChipButton
              key={time}
              label={time}
              selected={data.startTime === time}
              onClick={() => set("startTime", time)}
            />
          ))}
        </div>
      </div>

      {/* Question 3: Launch / Funding Deadline */}
      <div>
        <Label>
          DO YOU HAVE A LAUNCH DATE, EVENT, FUNDING DEADLINE, OR OTHER IMPORTANT
          DEADLINE?
        </Label>
        <Input
          cream
          placeholder="e.g. Product launch March 2027, funding deadline in April..."
          value={data.deadline}
          onChange={(v) => set("deadline", v)}
        />
      </div>

      {/* Question 4: Decision Makers */}
      <div>
        <Label>WHO WILL BE INVOLVED IN THE DECISION?</Label>
        <div className="flex flex-wrap gap-2.5 mt-1.5">
          {DECISION_MAKERS.map((dm) => (
            <ChipButton
              key={dm}
              label={dm}
              selected={data.decisionMakers === dm}
              onClick={() => set("decisionMakers", dm)}
            />
          ))}
        </div>
      </div>

      {/* Question 5: Other Stakeholders */}
      <div>
        <Label>
          IF OTHER DECISION-MAKERS OR TECHNICAL STAKEHOLDERS SHOULD BE PART OF
          THE DISCUSSION, PLEASE LET US KNOW.
        </Label>
        <Textarea
          cream
          rows={3}
          placeholder="Names, roles, or email addresses if relevant."
          value={data.otherStakeholders}
          onChange={(v) => set("otherStakeholders", v)}
        />
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   SUCCESS STATE
----------------------------------------------------------------------- */
function SuccessState({ orgName }: { orgName: string }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6 gap-5">
      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
        <RiCheckLine className="text-white text-[36px]" />
      </div>
      <div>
        <h2 className="text-[28px] md:text-[34px] font-primary font-semibold text-gray-900 dark:text-white mb-2">
          Application Received
        </h2>
        <div className="mx-auto w-10 h-[3px] bg-primary rounded-full mb-5" />
        <p className="text-[15px] leading-[26px] text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Thank you. We have received your application from{" "}
          <strong className="text-gray-900 dark:text-white">
            {orgName || "your organization"}
          </strong>
          .
        </p>
        <p className="text-[15px] leading-[26px] text-gray-600 dark:text-gray-400 max-w-md mx-auto mt-2">
          Our team will review your submission and reach out within{" "}
          <span className="text-primary font-semibold">48 business hours</span>{" "}
          to schedule a discovery call.
        </p>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <Link
          href="/partnerships"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-[14px] hover:bg-primary transition-all"
        >
          Back to Partnerships
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 font-semibold text-[14px] hover:border-gray-400 transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------
   MAIN PAGE
----------------------------------------------------------------------- */

export default function PartnershipApplyPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL);

  const setField = (key: keyof FormData, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setStrField = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNext = () => {
    if (step < STEPS.length) setStep((s) => s + 1);
    else setSubmitted(true);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  return (
    <main className="flex flex-col items-center w-full">
      {/* ── Hero ── */}
      <Section className="relative flex flex-col justify-between min-h-[100dvh] bg-apply-hero dark:bg-apply-hero-dark bg-cover bg-center bg-no-repeat pt-28 md:pt-32 pb-16">
        {/* Background ecobg overlay */}
        <div className="absolute right-[60%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-70 pointer-events-none">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>

        <div className="flex flex-col gap-6 justify-center flex-1 w-full">
          <ScrollReveal direction="none">
            <nav className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
              <Link
                href="/partnerships"
                className="hover:text-primary transition-colors"
              >
                Partnerships
              </Link>
              <span>&rsaquo;</span>
              <span className="text-gray-900 dark:text-white font-medium">
                Apply
              </span>
            </nav>
          </ScrollReveal>

          <ScrollReveal direction="none">
            <Badge title="Partnership Application" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] 2xl:text-[96px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] 2xl:leading-[104px] font-primary font-normal tracking-tight text-gray-900 dark:text-white">
              Apply to Partner <br className="hidden sm:block" />
              <span className="text-primary">With AE</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[30px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[46px] text-[#7C7C7C] dark:text-gray-400">
              Tell us about yourself, your organization, and what you are
              looking to build. We review every application and respond within
              48 hours.
            </p>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <ScrollReveal direction="none" delay={800}>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[11px] tracking-[0.2em] uppercase text-gray-400 font-medium animate-pulse-slow">
              Scroll
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent animate-float" />
          </div>
        </ScrollReveal>
      </Section>

      {/* ── Multi-step Form ── */}
      <section className="relative w-full px-4 md:px-20 py-16 md:py-24 bg-[#FDFCF5] dark:bg-[#0D0D0D] overflow-hidden">
        {/* Decorative ecobg */}

        <div className="relative ">
          {submitted ? (
            /* ── Success card ── */
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm overflow-hidden">
              <SuccessState orgName={form.orgName} />
            </div>
          ) : (
            <>
              {/* ── Stepper ── */}
              <div className="mb-10 w-full overflow-x-auto pb-3 pt-1 scrollbar-none">
                <div className="min-w-[580px] sm:min-w-0 flex items-start justify-between w-full">
                  {STEPS.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = s.id === step;
                    const isDone = s.id < step;

                    return (
                      <div key={s.id} className="contents">
                        {/* Step Node */}
                        <div
                          onClick={() => {
                            if (s.id <= step) setStep(s.id);
                          }}
                          className="flex flex-col items-center flex-shrink-0 cursor-pointer group select-none"
                        >
                          <div
                            className={cn(
                              "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-[1.5px] transition-all duration-300",
                              isDone
                                ? "bg-primary border-primary text-white shadow-sm"
                                : isActive
                                  ? "bg-white dark:bg-[#1A1A1A] border-primary text-primary shadow-sm"
                                  : "bg-white dark:bg-[#1A1A1A] border-[#CFD6DE] dark:border-white/20 text-[#8C9AA8] dark:text-gray-400 group-hover:border-gray-400",
                            )}
                          >
                            {isDone ? (
                              <RiCheckboxCircleLine className="text-[20px] sm:text-[22px] text-white" />
                            ) : (
                              <Icon className="text-[19px] sm:text-[21px]" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "mt-2.5 text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase text-center whitespace-nowrap transition-colors",
                              isActive || isDone
                                ? "text-primary"
                                : "text-[#9AA5B1] dark:text-gray-400",
                            )}
                          >
                            {s.label.toUpperCase()}
                          </span>
                        </div>

                        {/* Discrete Connector Line with visible gap */}
                        {idx < STEPS.length - 1 && (
                          <div className="flex-1 mx-2 sm:mx-5 mt-[21px] sm:mt-[23px] h-[1.5px] bg-[#CCD3DC] dark:bg-white/20" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── White card: fields + nav ── */}
              <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
                <div className="p-6 md:p-10">
                  {step === 1 && <StepAboutYou data={form} set={setStrField} />}
                  {step === 2 && (
                    <StepOrganization data={form} set={setStrField} />
                  )}
                  {step === 3 && (
                    <StepProject data={form} setField={setField} />
                  )}
                  {step === 4 && (
                    <StepSituation
                      data={form}
                      set={setStrField}
                      setField={setField}
                    />
                  )}
                  {step === 5 && (
                    <StepServices data={form} setField={setField} />
                  )}
                  {step === 6 && <StepBudget data={form} set={setStrField} />}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-white/10" />

                {/* Navigation row */}
                <div className="px-6 md:px-10 py-5 flex items-center justify-between">
                  {/* Left: Back */}
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-2 text-[14px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <RiArrowLeftLine />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {/* Right: Step counter + Continue / Submit */}
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] text-gray-400">
                      Step {step} of {STEPS.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNext}
                      className={cn(
                        "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all cursor-pointer shadow-sm",
                        step === STEPS.length
                          ? "bg-primary hover:bg-primary/90 text-white"
                          : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white",
                      )}
                    >
                      {step < STEPS.length ? "Continue" : "Submit Application"}
                      <RiArrowRightLine />
                    </button>
                  </div>
                </div>
              </div>

              {/* Security note */}
              <p className="mt-4 text-center text-[12px] text-gray-400 flex items-center justify-center gap-1.5">
                <RiShieldCheckLine className="text-[14px]" />
                Your information is secure and will never be shared
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="w-full bg-[#111111] dark:bg-black py-14 px-4 md:px-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { stat: "48h", label: "AVERAGE RESPONSE TIME" },
            { stat: "100%", label: "APPLICATIONS PERSONALLY REVIEWED" },
            { stat: "Atlanta, GA", label: "BASED IN THE AMERICAN SOUTH" },
          ].map((item, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 120}>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[42px] md:text-[52px] font-primary font-normal text-primary leading-none">
                  {item.stat}
                </span>
                <span className="text-[11px] tracking-[0.18em] uppercase text-gray-400 font-medium">
                  {item.label}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </main>
  );
}
