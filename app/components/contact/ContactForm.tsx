"use client";

import React, { useActionState } from "react";
import Buttons from "@/app/components/common/ui/Buttons";
import { BiSend } from "react-icons/bi";
import { sendContactEmail, type ActionState } from "@/lib/actions/contact";

const initialState: ActionState = {
  error: "",
  success: "",
};


export default function ContactForm() {
  const [state, action, isPending] = useActionState(sendContactEmail, initialState);

  const inputClass =
    "px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600";

  const labelClass =
    "text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider";

  return (
    <form action={action} className="bg-white dark:bg-[#141414] p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="fullName" className={labelClass}>
            Full Name *
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            required
            placeholder="John Doe"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="organization" className={labelClass}>
            Organization
          </label>
          <input
            type="text"
            id="organization"
            name="organization"
            placeholder="Your Organization"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="john@example.com"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="+1 800 000 0000"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="projectType" className={labelClass}>
          Project Type *
        </label>
        <select
          id="projectType"
          name="projectType"
          required
          className={`${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%236b7280%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat`}
        >
          <option value="">Select a Project type</option>
          <option value="Website Development">Website Development</option>
          <option value="Platform System">Platform System</option>
          <option value="Admin Dashboard">Admin Dashboard</option>
          <option value="Membership System">Membership System</option>
          <option value="Workflow Automation">Workflow Automation</option>
          <option value="Partnership Inquiry">Partnership Inquiry</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className={labelClass}>
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your project and how we can help..."
          className={`${inputClass} resize-none`}
        ></textarea>
      </div>

      {state.error && (
        <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/40">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/40">
          {state.success}
        </p>
      )}

      <Buttons
        type="submit"
        primaryButton
        lg
        disabled={isPending}
        className="mt-2"
      >
        {isPending ? "Sending..." : "Send Message"}
        {!isPending && <BiSend className="ml-2" />}
      </Buttons>
    </form>
  );
}
