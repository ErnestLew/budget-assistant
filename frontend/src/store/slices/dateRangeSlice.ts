import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
  isSameMonth,
} from "date-fns";

// ---- Helpers ----

function getMonthRange(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    label: format(date, "MMM yyyy"),
    currentDate: format(date, "yyyy-MM-dd"),
  };
}

// ---- State ----

interface DateRangeState {
  startDate: string;
  endDate: string;
  label: string;
  currentDate: string; // tracks the currently viewed month
  isCustom: boolean;
}

function buildInitialState(): DateRangeState {
  const now = new Date();
  const range = getMonthRange(now);
  return {
    ...range,
    isCustom: false,
  };
}

const initialState: DateRangeState = buildInitialState();

// ---- Slice ----

const dateRangeSlice = createSlice({
  name: "dateRange",
  initialState,
  reducers: {
    goToPreviousMonth(state) {
      const prev = new Date(state.currentDate);
      const newDate = subMonths(prev, 1);
      const range = getMonthRange(newDate);
      state.startDate = range.startDate;
      state.endDate = range.endDate;
      state.label = range.label;
      state.currentDate = range.currentDate;
      state.isCustom = false;
    },

    goToNextMonth(state) {
      const current = new Date(state.currentDate);
      // Don't go beyond the current calendar month
      if (isSameMonth(current, new Date())) return;
      const newDate = addMonths(current, 1);
      const range = getMonthRange(newDate);
      state.startDate = range.startDate;
      state.endDate = range.endDate;
      state.label = range.label;
      state.currentDate = range.currentDate;
      state.isCustom = false;
    },

    setCustomRange(state, action: PayloadAction<{ start: string; end: string }>) {
      const { start, end } = action.payload;
      const startDate = new Date(start);
      const endDate = new Date(end);
      state.startDate = format(startDate, "yyyy-MM-dd");
      state.endDate = format(endDate, "yyyy-MM-dd");
      state.label = `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
      state.isCustom = true;
    },

    resetToCurrentMonth(state) {
      const now = new Date();
      const range = getMonthRange(now);
      state.startDate = range.startDate;
      state.endDate = range.endDate;
      state.label = range.label;
      state.currentDate = range.currentDate;
      state.isCustom = false;
    },
  },
});

export const {
  goToPreviousMonth,
  goToNextMonth,
  setCustomRange,
  resetToCurrentMonth,
} = dateRangeSlice.actions;

export default dateRangeSlice.reducer;

// ---- Selectors ----

export const selectDateRange = (state: { dateRange: DateRangeState }) => ({
  startDate: state.dateRange.startDate,
  endDate: state.dateRange.endDate,
  label: state.dateRange.label,
});

export const selectIsCurrentMonth = (state: { dateRange: DateRangeState }) =>
  !state.dateRange.isCustom &&
  isSameMonth(new Date(state.dateRange.currentDate), new Date());

export const selectDateParams = (state: { dateRange: DateRangeState }) => ({
  start_date: state.dateRange.startDate,
  end_date: state.dateRange.endDate,
});
