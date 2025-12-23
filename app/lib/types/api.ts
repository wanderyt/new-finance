// User data structure (with password for mock auth)
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // Plain text for mock - would be hashed in production
}

// Client-safe user data (excludes sensitive fields)
export interface UserData {
  id: string;
  username: string;
  email: string;
}

// Login request payload
export interface LoginRequest {
  username: string;
  password: string;
}

// Login response (success)
export interface LoginResponse {
  success: true;
  user: UserData;
}

// Error response
export interface ErrorResponse {
  success: false;
  error: string;
}

// Verify response
export interface VerifyResponse {
  success: true;
  user: UserData;
}

// Logout response
export interface LogoutResponse {
  success: true;
  message: string;
}

// Session token payload (stored in cookie)
export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  createdAt: number;
}
