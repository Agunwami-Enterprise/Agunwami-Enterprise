"use client";

import React, { useState } from "react";
import { RiMailSendLine } from "react-icons/ri";
import NewsletterModal from "./NewsletterModal";

interface NewsletterCardProps {
  category?: string;
  className?: string;
}

export default function NewsletterCard({
  category,
  className = "",
}: NewsletterCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        className={`rounded-2xl bg-gradient-to-br from-[#C89B3C] to-[#96691E] p-6 text-white shadow-md relative overflow-hidden group ${className}`}
      >
        {/* Background decorative glow */}
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

        <div className="relative z-10 flex flex-col gap-3">
          <h3 className="font-primary text-[18px] font-semibold leading-snug">
            Get insights delivered
          </h3>

          <p className="text-xs text-white/85 leading-relaxed">
            Join leaders and founders receiving curated perspectives on scalable
            digital infrastructure and enterprise strategy.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-2 w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-[0.99] text-white text-sm font-semibold border border-white/30 backdrop-blur-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
          >
            <RiMailSendLine className="text-base" />
            <span>Subscribe Free →</span>
          </button>
        </div>
      </div>

      <NewsletterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
