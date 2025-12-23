export interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  lastLoginTime: number | null;
  authStatus: "idle" | "loading" | "succeeded" | "failed";
  isVerifying: boolean; // Track initial session verification
}
