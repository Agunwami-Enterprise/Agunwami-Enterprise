"use client";

import React, { useState, useEffect, useActionState } from "react";
import {
  RiCloseLine,
  RiMailSendLine,
  RiCheckLine,
  RiSparklingLine,
  RiShieldCheckLine,
} from "react-icons/ri";
import {
  subscribeNewsletter,
  type NewsletterActionState,
} from "@/lib/actions/newsletter";

const INITIAL_STATE: NewsletterActionState = {
  error: "",
  success: "",
};

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsletterModal({
  isOpen,
  onClose,
}: NewsletterModalProps) {
  const [state, formAction, isPending] = useActionState(
    subscribeNewsletter,
    INITIAL_STATE
  );

  const [frequency, setFrequency] = useState<string>("Weekly");

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/30 p-6 sm:p-8 flex flex-col gap-6 text-gray-900 dark:text-white transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RiCloseLine className="text-xl" />
        </button>

        {/* Success View */}
        {state.success ? (
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center text-3xl">
              <RiCheckLine />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-primary font-bold text-gray-900 dark:text-white">
                You're Subscribed!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                {state.success}
              </p>
            </div>
            <div className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <RiShieldCheckLine className="text-primary text-base flex-shrink-0" />
              <span>
                We respect your inbox. You can unsubscribe at any time in one click.
              </span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="mt-2 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form View */
          <>
            {/* Header */}
            <div className="space-y-2 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 w-fit">
                <RiSparklingLine />
                <span>Executive Insights</span>
              </div>
              <h2
                id="newsletter-modal-title"
                className="text-2xl font-primary font-bold text-gray-900 dark:text-white tracking-tight leading-snug"
              >
                Get Insights Delivered
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Join founders, technology executives, and systems architects receiving our practical perspectives on scalable digital infrastructure.
              </p>
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
                {state.error}
              </div>
            )}

            {/* Form */}
            <form action={formAction} className="flex flex-col gap-4">
              {/* Inputs */}
              <div className="space-y-3.5">
                <div>
                  <label
                    htmlFor="newsletter-fullName"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5"
                  >
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    id="newsletter-fullName"
                    name="fullName"
                    required
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newsletter-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5"
                  >
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    id="newsletter-email"
                    name="email"
                    required
                    placeholder="jane@company.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Cadence selection */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "Weekly", desc: "Weekly briefing" },
                    { val: "Monthly", desc: "Monthly deep dive" },
                  ].map((item) => (
                    <label
                      key={item.val}
                      className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                        frequency === item.val
                          ? "border-primary bg-primary/10 dark:bg-primary/15"
                          : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {item.val}
                        </span>
                        <input
                          type="radio"
                          name="frequency"
                          value={item.val}
                          checked={frequency === item.val}
                          onChange={() => setFrequency(item.val)}
                          className="text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <RiMailSendLine className="text-base" />
                      <span>Subscribe to Newsletter</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2.5">
                  Strictly zero spam. Unsubscribe anytime in one click.
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
