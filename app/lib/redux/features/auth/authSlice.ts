import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { AuthState } from "./authTypes";
import type { RootState } from "../../store";
import { LoginRequest, LoginResponse, VerifyResponse, UserData } from "@/app/lib/types/api";

const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  lastLoginTime: null,
  authStatus: "idle",
  isVerifying: true, // Start as true, will be set to false after initial verification
};

// Async thunk for login
export const loginAsync = createAsyncThunk<
  UserData,
  LoginRequest,
  { rejectValue: string }
>("auth/loginAsync", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post<LoginResponse>(
      "/api/auth/login",
      credentials,
      { withCredentials: true }
    );

    return response.data.user;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(error.response.data.error || "Login failed");
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for session verification
export const verifySessionAsync = createAsyncThunk<
  UserData,
  void,
  { rejectValue: string }
>("auth/verifySession", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get<VerifyResponse>(
      "/api/auth/verify",
      { withCredentials: true }
    );

    return response.data.user;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(error.response.data.error || "Session invalid");
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for logout
export const logoutAsync = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logoutAsync",
  async (_, { rejectWithValue }) => {
    try {
      await axios.post(
        "/api/auth/logout",
        {},
        { withCredentials: true }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue("Logout failed");
      }
      return rejectWithValue("Network error. Please try again.");
    }
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Keep synchronous actions for backwards compatibility
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.lastLoginTime = Date.now();
      state.authStatus = "succeeded";
      state.isVerifying = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.lastLoginTime = null;
      state.authStatus = "idle";
      state.isVerifying = false;
    },
    setVerifying: (state, action: PayloadAction<boolean>) => {
      state.isVerifying = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login async
    builder
      .addCase(loginAsync.pending, (state) => {
        state.authStatus = "loading";
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.currentUser = action.payload.username;
        state.lastLoginTime = Date.now();
        state.authStatus = "succeeded";
      })
      .addCase(loginAsync.rejected, (state) => {
        state.authStatus = "failed";
        state.isAuthenticated = false;
        state.currentUser = null;
      });

    // Verify session async
    builder
      .addCase(verifySessionAsync.pending, (state) => {
        state.authStatus = "loading";
        state.isVerifying = true;
      })
      .addCase(verifySessionAsync.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.currentUser = action.payload.username;
        state.authStatus = "succeeded";
        state.isVerifying = false;
      })
      .addCase(verifySessionAsync.rejected, (state) => {
        state.authStatus = "idle";
        state.isAuthenticated = false;
        state.currentUser = null;
        state.isVerifying = false;
      });

    // Logout async
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.authStatus = "loading";
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.currentUser = null;
        state.lastLoginTime = null;
        state.authStatus = "idle";
      })
      .addCase(logoutAsync.rejected, (state) => {
        // Even if logout API fails, clear local state
        state.isAuthenticated = false;
        state.currentUser = null;
        state.lastLoginTime = null;
        state.authStatus = "idle";
      });
  },
});

export const { login, logout, setVerifying } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectCurrentUser = (state: RootState) => state.auth.currentUser;
export const selectAuthState = (state: RootState) => state.auth;
export const selectAuthStatus = (state: RootState) => state.auth.authStatus;
export const selectIsVerifying = (state: RootState) => state.auth.isVerifying;

export default authSlice.reducer;
