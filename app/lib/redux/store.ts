import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import finReducer from "./features/fin/finSlice";
import pocketMoneyReducer from "./features/pocketMoney/pocketMoneySlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      fin: finReducer,
      pocketMoney: pocketMoneyReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
