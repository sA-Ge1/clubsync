"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "club" | "student" | "faculty" | "admin" | "notset";

interface UserInfo {
  auth_id: string;
  email: string;
  name: string;
  user_id: string;
  role: Role;
  avatar:string;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const parseJwtPayload = (token: string): Record<string, any> | null => {
    try {
      const payloadPart = token.split(".")[1];
      if (!payloadPart) {
        return null;
      }
      const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
      const decoded = JSON.parse(atob(padded));
      return decoded ?? null;
    } catch {
      return null;
    }
  };

  const fetchUser = async (): Promise<void> => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    const tokenPayload = accessToken ? parseJwtPayload(accessToken) : null;

    const authUserId =
      typeof tokenPayload?.sub === "string" ? tokenPayload.sub : session?.user?.id;
    if (!authUserId) {
      setUser(null);
      setLoading(false);
      return;
    }
    else{

    
    // fetch details from your custom profiles table
    const { data, error } = await supabase
      .from("auth")
      .select("email, role, club_id,faculty_id,student_id")
      .eq("id", authUserId)
      .single();

    if (error) {
      console.error("Error fetching user metadata:", error);
    }

    const role: Role = (data?.role as Role) ?? "notset";
    const derivedId =
      data?.student_id ??
      data?.club_id ??
      data?.faculty_id ??
      (role === "admin" ? authUserId : "notset");

    setUser({
      auth_id: authUserId,
      email:
        (typeof tokenPayload?.email === "string" ? tokenPayload.email : undefined) ??
        session?.user?.email ??
        data?.email ??
        "",
      name: session?.user?.user_metadata?.name ?? "",
      role,
      user_id: derivedId,
      avatar: session?.user?.user_metadata?.avatar || ""
    });

    setLoading(false);
  }
  };

  useEffect(() => {
    fetchUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        fetchUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return React.createElement(
    UserContext.Provider,
    { value: { user, loading, refresh: fetchUser } },
    children
  );
}

export function useUserInfo() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserInfo must be used within a UserProvider');
  }
  return context;
}