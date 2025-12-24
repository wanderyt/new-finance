"use client";

import ExpenseTile from "./ExpenseTile";
import { useAppSelector, useAppDispatch } from "@/app/lib/redux/hooks";
import {
  selectAuthStatus,
  logoutAsync
} from "@/app/lib/redux/features/auth/authSlice";

export default function Dashboard() {
  const authStatus = useAppSelector(selectAuthStatus);
  const dispatch = useAppDispatch();

  const isLoading = authStatus === "loading";

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      // Success - Redux state will update and trigger navigation
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if API fails, local state is cleared
    }
  };

  const handleAddExpense = () => {
    console.log("Add expense clicked - will open bottom sheet");
  };
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Hero Section with Background Image */}
      <div
        className="relative h-[370px] bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/fin-l.jpg')`,
          backgroundPosition: 'center 30%'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Logout Icon - top left */}
        <button
          onClick={handleLogout}
          disabled={isLoading}
          aria-label="Logout"
          className="absolute top-4 left-4 p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50 z-20"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>

        {/* Stats - positioned higher, side by side */}
        <div className="absolute bottom-[168px] left-4 right-4 flex gap-3 z-10">
          <div className="bg-black/30 rounded-lg px-4 py-2.5 shadow-lg flex-1">
            <div className="text-xs text-white/90 font-medium">Total Balance This Month</div>
            <div className="text-2xl font-bold text-white">$12,450</div>
          </div>
          <div className="bg-black/30 rounded-lg px-4 py-2.5 shadow-lg flex-1">
            <div className="text-xs text-white/90 font-medium">Total Expense This Week</div>
            <div className="text-xl font-bold text-red-300">-$335.49</div>
          </div>
        </div>
      </div>

      {/* Add Button - Middle Section */}
      <div className="flex justify-center -mt-8 z-20">
        <button
          onClick={handleAddExpense}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-20 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold text-lg tracking-wider"
        >
          记一笔
        </button>
      </div>

      {/* Expense List - Lower Section */}
      <div className="flex-1 overflow-visible -mt-2.5">
        <div className="bg-white dark:bg-zinc-900 shadow-lg h-full flex flex-col">
          <div className="overflow-y-auto flex-1">
            {[
              {
                category: "Food & Dining",
                subcategory: "Groceries",
                merchant: "Whole Foods",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$127.50",
                currency: "USD",
                exchangeInfo: { usd: "$127.50", cny: "¥920.00" }
              },
              {
                category: "Utilities",
                subcategory: "Electricity",
                merchant: "PG&E",
                place: "San Francisco, CA",
                isScheduled: true,
                amount: "-$85.20",
                currency: "USD",
                exchangeInfo: { usd: "$85.20", cny: "¥614.64" }
              },
              {
                category: "Transportation",
                subcategory: "Gas",
                merchant: "Chevron",
                place: "Oakland, CA",
                isScheduled: false,
                amount: "-$45.00",
                currency: "USD",
                exchangeInfo: { usd: "$45.00", cny: "¥324.90" }
              },
              {
                category: "Food & Dining",
                subcategory: "Restaurant",
                merchant: "Tartine Bakery",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$68.90",
                currency: "USD",
                exchangeInfo: { usd: "$68.90", cny: "¥497.00" }
              },
              {
                category: "Food & Dining",
                subcategory: "Coffee Shop",
                merchant: "Blue Bottle Coffee",
                place: "Berkeley, CA",
                isScheduled: false,
                amount: "-$12.50",
                currency: "USD",
                exchangeInfo: { usd: "$12.50", cny: "¥90.25" }
              },
              {
                category: "Healthcare",
                subcategory: "Pharmacy",
                merchant: "Walgreens",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$34.25",
                currency: "USD",
                exchangeInfo: { usd: "$34.25", cny: "¥247.21" }
              },
              {
                category: "Entertainment",
                subcategory: "Movie Theater",
                merchant: "AMC Metreon",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$28.50",
                currency: "USD",
                exchangeInfo: { usd: "$28.50", cny: "¥205.74" }
              },
              {
                category: "Shopping",
                subcategory: "Clothing",
                merchant: "Uniqlo",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$89.99",
                currency: "USD",
                exchangeInfo: { usd: "$89.99", cny: "¥649.73" }
              },
              {
                category: "Food & Dining",
                subcategory: "Fast Food",
                merchant: "Chipotle",
                place: "Oakland, CA",
                isScheduled: false,
                amount: "-$15.75",
                currency: "USD",
                exchangeInfo: { usd: "$15.75", cny: "¥113.72" }
              },
              {
                category: "Transportation",
                subcategory: "Public Transit",
                merchant: "BART",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$22.40",
                currency: "USD",
                exchangeInfo: { usd: "$22.40", cny: "¥161.73" }
              },
              {
                category: "Utilities",
                subcategory: "Internet",
                merchant: "Comcast",
                place: "San Francisco, CA",
                isScheduled: true,
                amount: "-$79.99",
                currency: "USD",
                exchangeInfo: { usd: "$79.99", cny: "¥577.53" }
              },
              {
                category: "Healthcare",
                subcategory: "Dental",
                merchant: "Dr. Smith Dentistry",
                place: "Berkeley, CA",
                isScheduled: false,
                amount: "-$150.00",
                currency: "USD",
                exchangeInfo: { usd: "$150.00", cny: "¥1,083.00" }
              },
              {
                category: "Food & Dining",
                subcategory: "Groceries",
                merchant: "Trader Joe's",
                place: "Berkeley, CA",
                isScheduled: false,
                amount: "-$63.42",
                currency: "USD",
                exchangeInfo: { usd: "$63.42", cny: "¥457.89" }
              },
              {
                category: "Shopping",
                subcategory: "Electronics",
                merchant: "Best Buy",
                place: "Emeryville, CA",
                isScheduled: false,
                amount: "-$299.99",
                currency: "USD",
                exchangeInfo: { usd: "$299.99", cny: "¥2,165.93" }
              },
              {
                category: "Entertainment",
                subcategory: "Streaming Service",
                merchant: "Netflix",
                place: "Online",
                isScheduled: true,
                amount: "-$15.49",
                currency: "USD",
                exchangeInfo: { usd: "$15.49", cny: "¥111.84" }
              },
              {
                category: "Food & Dining",
                subcategory: "Restaurant",
                merchant: "Chez Panisse",
                place: "Berkeley, CA",
                isScheduled: false,
                amount: "-$185.00",
                currency: "USD",
                exchangeInfo: { usd: "$185.00", cny: "¥1,335.70" }
              },
              {
                category: "Transportation",
                subcategory: "Ride Share",
                merchant: "Uber",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$32.15",
                currency: "USD",
                exchangeInfo: { usd: "$32.15", cny: "¥232.12" }
              },
              {
                category: "Shopping",
                subcategory: "Home Goods",
                merchant: "Target",
                place: "Oakland, CA",
                isScheduled: false,
                amount: "-$74.28",
                currency: "USD",
                exchangeInfo: { usd: "$74.28", cny: "¥536.20" }
              },
              {
                category: "Food & Dining",
                subcategory: "Coffee Shop",
                merchant: "Philz Coffee",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$8.75",
                currency: "USD",
                exchangeInfo: { usd: "$8.75", cny: "¥63.18" }
              },
              {
                category: "Entertainment",
                subcategory: "Concert",
                merchant: "The Fillmore",
                place: "San Francisco, CA",
                isScheduled: false,
                amount: "-$65.00",
                currency: "USD",
                exchangeInfo: { usd: "$65.00", cny: "¥469.30" }
              },
            ].map((expense, index) => (
              <ExpenseTile
                key={index}
                category={expense.category}
                subcategory={expense.subcategory}
                merchant={expense.merchant}
                place={expense.place}
                isScheduled={expense.isScheduled}
                amount={expense.amount}
                currency={expense.currency}
                exchangeInfo={expense.exchangeInfo}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
