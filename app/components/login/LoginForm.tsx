"use client";

import { useState, FormEvent } from "react";
import Input from "../ui-kit/Input";
import Button from "../ui-kit/Button";

interface LoginFormProps {
  onLoginSuccess: (username: string) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement actual authentication logic
    // For now, just call the success callback
    console.log("Login attempt:", { username, password });
    onLoginSuccess(username);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black px-4 py-8">
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
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-6"
            >
              Sign In
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
