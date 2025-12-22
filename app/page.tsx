"use client";

import { useState } from "react";
import LoginForm from "./components/LoginForm";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const handleLoginSuccess = (username: string) => {
    setIsAuthenticated(true);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main UI after successful login
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header with logout */}
      <header className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-sm z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            Welcome, {currentUser}!
          </h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm font-medium rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 active:bg-zinc-400 dark:active:bg-zinc-500 transition-colors touch-manipulation"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <p className="text-base text-zinc-600 dark:text-zinc-400 text-center">
            You are now logged in. This is where your main application UI will
            go.
          </p>
        </div>
      </main>
    </div>
  );
}
