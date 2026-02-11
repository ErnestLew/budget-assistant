"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import { format, addDays } from "date-fns";
import { useDateRange } from "@/hooks/use-date-range";

export function DateSelector() {
  const {
    dateRange,
    goToPreviousMonth,
    goToNextMonth,
    setCustomRange,
    resetToCurrentMonth,
    isCurrentMonth,
  } = useDateRange();

  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handleStartChange = (value: string) => {
    setCustomStart(value);
    if (value) {
      const start = new Date(value + "T00:00:00");
      const end = addDays(start, 29);
      setCustomEnd(format(end, "yyyy-MM-dd"));
    }
  };

  const handleApplyCustom = () => {
    if (customStart) {
      const start = new Date(customStart + "T00:00:00");
      const end = customEnd
        ? new Date(customEnd + "T00:00:00")
        : addDays(start, 29);
      setCustomRange(start, end);
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl px-5 py-3.5 border border-secondary-100 dark:border-secondary-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors text-secondary-500 dark:text-secondary-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 min-w-[150px] text-center">
            {dateRange.label}
          </span>

          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors text-secondary-500 dark:text-secondary-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {!isCurrentMonth && (
            <button
              onClick={resetToCurrentMonth}
              className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            showCustom
              ? "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
              : "border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-800 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500 dark:text-secondary-400">From</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => handleStartChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-secondary-200 dark:border-secondary-700 rounded-lg bg-secondary-50 dark:bg-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500 dark:text-secondary-400">To</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-secondary-200 dark:border-secondary-700 rounded-lg bg-secondary-50 dark:bg-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!customStart}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
