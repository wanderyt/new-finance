export interface AuthState {
  isAuthenticated: boolean;
  currentUser: string | null;
  lastLoginTime: number | null;
  authStatus: "idle" | "loading" | "succeeded" | "failed";
}
