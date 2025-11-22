"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserInfo {
  auth_id: string;
  email: string;
  name: string;
  user_id: string;
  role?: string;
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

  const fetchUser = async (): Promise<void> => {
    setLoading(true);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // fetch details from your custom profiles table
    const { data, error } = await supabase
      .from("auth")
      .select("email, role, club_id,faculty_id,student_id")
      .eq("id", authUser.id)
      .single();

    if (error) {
      console.error("Error fetching user metadata:", error);
    }

    setUser({
      auth_id: authUser.id,
      email: authUser.email!||data?.email,
      name:authUser.user_metadata.name,
      role: data?.role,
      user_id: data?.student_id||data?.club_id||data?.faculty_id,
    });

    setLoading(false);
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