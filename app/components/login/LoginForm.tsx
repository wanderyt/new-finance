"use client";

import { useState, FormEvent } from "react";
import Input from "../ui-kit/Input";
import Button from "../ui-kit/Button";
import { useAppDispatch, useAppSelector } from "@/app/lib/redux/hooks";
import { loginAsync, selectAuthStatus } from "@/app/lib/redux/features/auth/authSlice";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector(selectAuthStatus);

  const isLoading = authStatus === "loading";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      await dispatch(loginAsync({ username, password })).unwrap();
      // Success - Redux state will update and trigger navigation
    } catch (err) {
      setError(err as string);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black px-4 py-8">
      <div className="w-full max-w-sm mx-auto mt-20">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 sm:p-8 border border-zinc-200 dark:border-zinc-700">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Welcome Back
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to your account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
              Demo Credentials:
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Username: <span className="font-mono">demo</span>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Password: <span className="font-mono">password123</span>
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <Input
              id="username"
              type="text"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Enter your username"
              disabled={isLoading}
            />

            {/* Password Field */}
            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isLoading}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-5 text-center">
            <a
              href="#"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline active:text-blue-800 dark:active:text-blue-300"
            >
              Forgot your password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
