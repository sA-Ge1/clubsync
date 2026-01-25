"use client";

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DepartmentPublic } from "@/components/DepartmentPublic";

export default function DepartmentPublicPage() {
  const params = useParams();
  const router = useRouter();

  const deptId = params?.deptId as string | undefined;

  useEffect(() => {
    if (!deptId) {
      router.replace("/departments");
    }
  }, [deptId, router]);

  // Prevent rendering with invalid param
  if (!deptId) {
    return null; // or a loader / skeleton
  }
  return <DepartmentPublic deptId={deptId} />;
}



