"use client";

import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const { setAuthToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setAuthToken();
    router.push("/my-journey");
  }, [setAuthToken, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-amber-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
        <p className="mt-4 text-amber-800">Completing sign in...</p>
      </div>
    </div>
  );
}
