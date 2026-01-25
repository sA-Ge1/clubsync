"use client";

import { useEffect, useState } from "react";
import { useUserInfo } from "@/hooks/useUserInfo";
import { DepartmentPublic } from "@/components/DepartmentPublic";
import { DepartmentPrivate } from "@/components/DepartmentPrivate";
import { supabase } from "@/lib/supabaseClient";

export default function DepartmentPage() {
  const { user, loading: userLoading } = useUserInfo();

  const [deptId, setDeptId] = useState<string | null>(null);
  const [loadingDept, setLoadingDept] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    // No user → no department
    if (!user) {
      setDeptId(null);
      setLoadingDept(false);
      return;
    }

    // Admin flow (deptId can come from route later)
    if (user.role === "admin") {
      setDeptId(null);
      setLoadingDept(false);
      return;
    }

    // Faculty flow → resolve dept_id
    if (user.role === "faculty") {
      const fetchFacultyDept = async () => {
        const { data, error } = await supabase
          .from("faculty")
          .select("dept_id")
          .eq("faculty_id", user.user_id)
          .single();

        if (!error && data?.dept_id) {
          setDeptId(data.dept_id);
        } else {
          setDeptId(null);
        }

        setLoadingDept(false);
      };

      fetchFacultyDept();
      return;
    }

    // Default (student / others)
    setDeptId(null);
    setLoadingDept(false);
  }, [user, userLoading]);

  /* -------- Loading state -------- */
  if (userLoading || loadingDept) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading department...
      </div>
    );
  }

  /* -------- Render by role -------- */
  if (user?.role === "faculty"||user?.role === "admin") {
    return (
        <DepartmentPrivate deptId={deptId||""} />
    );
  }
}


