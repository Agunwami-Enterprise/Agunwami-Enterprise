"use client";

import { useState } from "react";
import {
  RiLinkedinBoxFill,
  RiTwitterXLine,
  RiLinkM,
  RiCheckLine,
} from "react-icons/ri";

interface ShareButtonsProps {
  title: string;
  slug: string;
}

export default function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `https://agunwami.com/insights/${slug}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(title)}`;

  return (
    <div className="flex items-center gap-2">
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[#0A66C2] hover:text-[#0A66C2] text-sm font-medium transition-all"
        aria-label="Share on LinkedIn"
      >
        <RiLinkedinBoxFill className="text-base text-[#0A66C2]" />
        <span>LinkedIn</span>
      </a>

      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-900 hover:text-gray-900 dark:hover:border-white dark:hover:text-white text-sm font-medium transition-all"
        aria-label="Share on X (Twitter)"
      >
        <RiTwitterXLine className="text-base" />
        <span>X</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
          copied
            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
            : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-primary hover:border-primary"
        }`}
        aria-label={copied ? "Link copied" : "Copy link"}
        title={copied ? "Link copied!" : "Copy link"}
      >
        {copied ? (
          <>
            <RiCheckLine className="text-base text-emerald-500" />
            <span className="text-xs font-medium">Copied!</span>
          </>
        ) : (
          <RiLinkM className="text-base" />
        )}
      </button>
    </div>
  );
}
