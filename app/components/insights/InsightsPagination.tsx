"use client";

import { RiArrowRightLine } from "react-icons/ri";
import { cn } from "@/lib/utils";

interface InsightsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function InsightsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: InsightsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            "w-10 h-10 rounded-lg text-sm font-semibold transition-all cursor-pointer",
            currentPage === page
              ? "bg-primary text-white shadow-md"
              : "bg-white dark:bg-[#161616] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-primary",
          )}
        >
          {page}
        </button>
      ))}
      {currentPage < totalPages && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className="px-4 h-10 rounded-lg text-sm font-semibold bg-white dark:bg-[#161616] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-primary flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span>Next</span>
          <RiArrowRightLine className="text-sm" />
        </button>
      )}
    </div>
  );
}
