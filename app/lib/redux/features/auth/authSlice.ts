import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthState } from "./authTypes";
import type { RootState } from "../../store";

const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  lastLoginTime: null,
  authStatus: "idle",
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.lastLoginTime = Date.now();
      state.authStatus = "succeeded";
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.lastLoginTime = null;
      state.authStatus = "idle";
    },
  },
});

export const { login, logout } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectCurrentUser = (state: RootState) => state.auth.currentUser;
export const selectAuthState = (state: RootState) => state.auth;

export default authSlice.reducer;
