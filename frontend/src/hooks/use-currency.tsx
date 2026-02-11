"use client";

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/use-store";
import {
  selectCurrencyCode,
  setCurrency as setCurrencyAction,
  formatAmount as fmtAmount,
} from "@/store/slices/currencySlice";
import {
  useGetSupportedCurrenciesQuery,
  useUpdateUserMutation,
} from "@/store/api";

interface CurrencyInfo {
  code: string;
  name: string;
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  formatAmount: (amount: number) => string;
  isUpdating: boolean;
  supportedCurrencies: CurrencyInfo[];
}

export function useCurrency(): CurrencyContextValue {
  const dispatch = useAppDispatch();
  const currency = useAppSelector(selectCurrencyCode);
  const { data: supported } = useGetSupportedCurrenciesQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const setCurrency = useCallback(
    (code: string) => {
      dispatch(setCurrencyAction(code));
      updateUser({ preferred_currency: code });
    },
    [dispatch, updateUser]
  );

  const formatAmount = useCallback(
    (amount: number) => fmtAmount(currency, amount),
    [currency]
  );

  return {
    currency,
    setCurrency,
    formatAmount,
    isUpdating,
    supportedCurrencies: (supported as CurrencyInfo[]) || [],
  };
}
