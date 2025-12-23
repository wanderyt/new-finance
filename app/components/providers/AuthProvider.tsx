"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/lib/redux/hooks";
import { verifySessionAsync, selectIsVerifying } from "@/app/lib/redux/features/auth/authSlice";
import Loading from "../ui-kit/Loading";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isVerifying = useAppSelector(selectIsVerifying);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Always call verify API since HttpOnly cookies can't be read by JavaScript
        // The API will return 401 if no cookie exists or if it's invalid
        await dispatch(verifySessionAsync()).unwrap();
      } catch (error) {
        // Session invalid, expired, or no cookie - verification already sets isVerifying to false
        console.log("Session verification failed:", error);
      }
    };

    verifySession();
  }, [dispatch]);

  // Show full-screen loading while verifying session
  if (isVerifying) {
    return <Loading fullScreen size="lg" message="Verifying session..." />;
  }

  return <>{children}</>;
}
