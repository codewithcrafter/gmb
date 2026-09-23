"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  googleLogin: (credentialOrData: any) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_link?: string }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch current user from /api/auth/me on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Include HttpOnly cookies
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Invalid email or password.");
      }

      const userData = await res.json();
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Signup failed. Please try again.");
      }

      const userData = await res.json();
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Google authentication failed.");
      }

      const userData = await res.json();
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      setLoading(false);
      window.location.href = "/login";
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Failed to process forgot password request.");
    }

    return await res.json();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
