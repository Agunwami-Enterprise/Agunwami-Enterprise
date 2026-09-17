"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { BsArrowRight, BsX } from "react-icons/bs";
import { RiSparklingLine } from "react-icons/ri";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [hasShown, setHasShown] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", idea: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    try {
      sessionStorage.setItem("ae_exit_popup_dismissed", "1");
    } catch {}
  }, []);

  const trigger = useCallback(() => {
    try {
      if (sessionStorage.getItem("ae_exit_popup_dismissed")) return;
    } catch {}
    if (hasShown) return;
    setHasShown(true);
    setIsOpen(true);
  }, [hasShown]);

  // Desktop: mouse exits toward top of viewport
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) trigger();
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [trigger]);

  // Mobile / fallback: show after 30s of inactivity on page
  useEffect(() => {
    timerRef.current = setTimeout(trigger, 30_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger]);

  // Trap focus within dialog when open
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, dismiss]);

  const validate = () => {
    const newErrors: Partial<typeof form> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormState("submitting");
    // Simulate an API call — replace with actual endpoint (e.g. /api/leads)
    try {
      await new Promise((res) => setTimeout(res, 1200));
      setFormState("success");
      try {
        sessionStorage.setItem("ae_exit_popup_dismissed", "1");
      } catch {}
    } catch {
      setFormState("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-popup-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#141414] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Gold accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#C89B3C] via-[#E0B85C] to-[#C89B3C]" />

        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Close popup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
        >
          <BsX className="text-xl" />
        </button>

        <div className="p-6 md:p-8 space-y-5">
          {formState === "success" ? (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <RiSparklingLine className="text-3xl text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-[24px] font-primary text-gray-900 dark:text-white">
                  Thanks, {form.name.split(" ")[0]}!
                </h2>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  We've received your idea. One of our team members will reach
                  out within 24–48 hours.
                </p>
              </div>
              <button
                onClick={dismiss}
                className="mt-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide">
                  <RiSparklingLine />
                  <span>Before you go…</span>
                </div>
                <h2
                  id="exit-popup-title"
                  className="text-[26px] md:text-[30px] font-primary font-normal text-gray-900 dark:text-white leading-tight"
                >
                  Got an idea?{" "}
                  <span className="text-primary">Let's talk.</span>
                </h2>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Share it with us — even if it's just a rough concept. We'd
                  love to hear what you're building.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-4"
                id="exit-intent-form"
              >
                {/* Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="popup-name"
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                  >
                    Your Name
                  </label>
                  <input
                    id="popup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Amara Johnson"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow ${
                      errors.name
                        ? "border-red-400"
                        : "border-gray-200 dark:border-white/15"
                    }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label
                    htmlFor="popup-email"
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                  >
                    Email Address
                  </label>
                  <input
                    id="popup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="e.g. amara@company.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow ${
                      errors.email
                        ? "border-red-400"
                        : "border-gray-200 dark:border-white/15"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Idea */}
                <div className="space-y-1">
                  <label
                    htmlFor="popup-idea"
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                  >
                    What would you like to create?
                    <span className="text-gray-400 font-normal normal-case ml-1">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="popup-idea"
                    rows={3}
                    placeholder="Even just an idea is fine — tell us what you're thinking…"
                    value={form.idea}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, idea: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/15 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow"
                  />
                </div>

                {formState === "error" && (
                  <p className="text-xs text-red-500 text-center">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={formState === "submitting"}
                  id="exit-popup-submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {formState === "submitting" ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      Send My Idea <BsArrowRight />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  No thanks, I'll continue browsing
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
