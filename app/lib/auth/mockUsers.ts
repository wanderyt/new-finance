import { User, UserData } from "../types/api";

// Mock users with plain text passwords (for demo only)
export const mockUsers: User[] = [
  {
    id: "user-001",
    username: "john_doe",
    email: "john@example.com",
    password: "password123",
  },
  {
    id: "user-002",
    username: "jane_smith",
    email: "jane@example.com",
    password: "password123",
  },
  {
    id: "demo",
    username: "demo",
    email: "demo@example.com",
    password: "password123",
  },
];

// Helper function to find user by username
export function findUserByUsername(username: string): User | undefined {
  return mockUsers.find(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );
}

// Helper function to find user by ID
export function findUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id);
}

// Convert User to UserData (strip sensitive fields)
export function toUserData(user: User): UserData {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

// Validate password (simple comparison for mock)
export function validatePassword(inputPassword: string, userPassword: string): boolean {
  return inputPassword === userPassword;
}
