import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api";
import currencyReducer from "./slices/currencySlice";
import dateRangeReducer from "./slices/dateRangeSlice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    currency: currencyReducer,
    dateRange: dateRangeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
