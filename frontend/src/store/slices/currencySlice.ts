import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../api";

const NO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "IDR", "TWD"]);

interface CurrencyState {
  code: string;
}

const initialState: CurrencyState = {
  code: "MYR",
};

const currencySlice = createSlice({
  name: "currency",
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<string>) {
      state.code = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      api.endpoints.getUser.matchFulfilled,
      (state, action) => {
        const payload = action.payload as {
          preferred_currency?: string;
        } | null;
        if (payload?.preferred_currency) {
          state.code = payload.preferred_currency;
        }
      },
    );
  },
});

export const { setCurrency } = currencySlice.actions;
export default currencySlice.reducer;

// Selectors
export const selectCurrencyCode = (state: { currency: CurrencyState }) =>
  state.currency.code;

export function formatAmount(code: string, amount: number): string {
  const noDecimals = NO_DECIMAL_CURRENCIES.has(code);
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  });
  return `${code} ${formatted}`;
}
