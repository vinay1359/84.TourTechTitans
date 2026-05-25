"use client";

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { API_URL } from "@/app/utils/api";
import Link from "next/link";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/my-journey");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/login`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-amber-200">
        {/* Logo/Icon could go here */}
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
            <span className="text-amber-800 text-2xl font-bold">H</span>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-amber-800 mb-3 text-center">
          Welcome to Histoury
        </h1>
        
        <p className="text-amber-700 text-center mb-8">
          Your personal journey through time and memories
        </p>
        
        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center w-full gap-3 bg-white text-amber-900 font-semibold px-6 py-3 rounded-xl shadow hover:shadow-lg transition duration-300 border border-amber-200 hover:border-amber-400 hover:bg-amber-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
          
          <div className="flex items-center justify-center">
            <div className="border-t border-amber-200 flex-grow"></div>
            <span className="px-4 text-xs text-amber-500">or</span>
            <div className="border-t border-amber-200 flex-grow"></div>
          </div>
          
          <button onClick={() => window.location.href = '/'} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition duration-300">
            Continue as Guest
          </button>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-amber-600 text-sm">
            New to Histoury? <Link href="/" className="text-amber-800 font-semibold hover:underline">Learn more</Link>
          </p>
        </div>
      </div>
      
      <div className="mt-6 text-amber-700 text-sm text-center max-w-md">
        By signing in, you agree to our <a href="#" className="text-amber-800 underline">Terms of Service</a> and <a href="#" className="text-amber-800 underline">Privacy Policy</a>
      </div>
    </div>
  );
}
