"use client";

import Button from "../ui-kit/Button";

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

export default function Dashboard({ username, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header with logout */}
      <header className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 shadow-sm z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            Welcome, {username}!
          </h1>
          <Button onClick={onLogout} variant="ghost" size="sm">
            Logout
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <main className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Welcome Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Dashboard
          </h2>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            You are successfully logged in as <span className="font-medium text-zinc-900 dark:text-zinc-50">{username}</span>.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total Balance</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">$12,450</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">This Month</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">+$1,240</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { label: "Salary Deposit", amount: "+$3,500", date: "Dec 20" },
              { label: "Grocery Store", amount: "-$127.50", date: "Dec 19" },
              { label: "Electric Bill", amount: "-$85.20", date: "Dec 18" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {item.label}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.date}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    item.amount.startsWith("+")
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="primary" size="lg">
            Send Money
          </Button>
          <Button variant="secondary" size="lg">
            Add Funds
          </Button>
        </div>
      </main>
    </div>
  );
}
