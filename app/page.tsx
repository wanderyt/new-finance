"use client";

import { AnimatePresence, motion } from "framer-motion";
import LoginForm from "./components/login/LoginForm";
import Dashboard from "./components/dashboard/Dashboard";
import { useAppSelector } from "./lib/redux/hooks";
import { selectIsAuthenticated } from "./lib/redux/features/auth/authSlice";

export default function Home() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <LoginForm />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <Dashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
