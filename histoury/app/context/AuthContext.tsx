"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/app/utils/api";

interface User {
  user_id: string;
  email: string;
  display_name: string;
  profile_picture_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setAuthToken: (token?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
  setAuthToken: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUserFromToken = useCallback(async () => {
    if (!mounted) return;

    try {
      const response = await fetch(`${API_URL}/auth/user`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Failed to load user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [mounted]);

  const setAuthToken = () => {
    loadUserFromToken();
  };

  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  const logout = async () => {
    try {
      setIsLoading(true);

      // Clear auth state first
      setUser(null);

      try {
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          console.warn(
            "Logout endpoint returned non-OK status:",
            response.status
          );
        }
      } catch (error) {
        console.warn("Error calling logout endpoint:", error);
        // Continue with logout even if the endpoint call fails
      }

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Ensure we still redirect even if there's an error
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !mounted || isLoading,
        isAuthenticated: !!user,
        logout,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
