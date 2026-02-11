"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { useAppSelector, useAppDispatch } from "@/hooks/use-store";
import {
  selectDateRange,
  selectIsCurrentMonth,
  goToPreviousMonth as goPrev,
  goToNextMonth as goNext,
  setCustomRange as setCustom,
  resetToCurrentMonth as resetCurrent,
} from "@/store/slices/dateRangeSlice";

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface DateRangeContextValue {
  dateRange: DateRange;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  setCustomRange: (start: Date, end: Date) => void;
  resetToCurrentMonth: () => void;
  isCurrentMonth: boolean;
}

export function useDateRange(): DateRangeContextValue {
  const dispatch = useAppDispatch();
  const dateRange = useAppSelector(selectDateRange);
  const isCurrentMonth = useAppSelector(selectIsCurrentMonth);

  const goToPreviousMonth = useCallback(() => dispatch(goPrev()), [dispatch]);
  const goToNextMonth = useCallback(() => dispatch(goNext()), [dispatch]);
  const setCustomRange = useCallback(
    (start: Date, end: Date) =>
      dispatch(
        setCustom({
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
        })
      ),
    [dispatch]
  );
  const resetToCurrentMonth = useCallback(
    () => dispatch(resetCurrent()),
    [dispatch]
  );

  return {
    dateRange,
    goToPreviousMonth,
    goToNextMonth,
    setCustomRange,
    resetToCurrentMonth,
    isCurrentMonth,
  };
}
