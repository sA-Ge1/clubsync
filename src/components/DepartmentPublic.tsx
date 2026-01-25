"use client";

import { useEffect, useState } from "react";
import { useRouter,usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ArrowLeft,
  Mail,
  ArrowRight,
  UserStar,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import { useUserInfo } from "@/hooks/useUserInfo";
import path from "path";

/* ================= TYPES ================= */

interface Department {
  dept_id: string;
  name: string;
  description: string | null;
}

interface Faculty {
  faculty_id: string;
  name: string;
  email: string | null;
}

interface DepartmentPublicProps {
  deptId: string;
}

interface HOD {
    faculty_id: string;
    name: string;
  }
  

/* ================= COMPONENT ================= */

export function DepartmentPublic({ deptId }: DepartmentPublicProps) {
  const router = useRouter();
  const { user, loading: userLoading } = useUserInfo();

  const [department, setDepartment] = useState<Department | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [hod, setHod] = useState<HOD | null>(null);
  const [studentCount, setStudentCount] = useState<number>(0);
  const pathName = usePathname();
  const isFaculty =
  !!user &&
  (
    user.role === "faculty" ||
    user.role === "admin" ||
    faculty.some((f) => f.faculty_id === user.user_id)
  );

  /* -------- Fetch data when deptId changes -------- */
  useEffect(() => {
    if (!deptId) return;

    let isActive = true;

    // Reset state immediately on deptId change
    setDepartment(null);
    setFaculty([]);
    setLoading(true);

    const fetchData = async () => {
      try {
        const [{ data: deptData }, { data: facultyData }, { count: studentsCount }] =
        await Promise.all([
            supabase
            .from("departments")
            .select("dept_id, name, description, hod")
            .eq("dept_id", deptId)
            .single(),

            supabase
            .from("faculty")
            .select("faculty_id, name, email")
            .eq("dept_id", deptId),

            supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("dept_id", deptId),
        ]);
        if (deptData?.hod) {
            const { data: hodData } = await supabase
              .from("faculty")
              .select("faculty_id, name")
              .eq("faculty_id", deptData.hod)
              .single();
          
            setHod(hodData || null);
          }
          
                    

        if (!isActive) return;

        if (!deptData) {
          router.replace("/departments");
          return;
        }

          setStudentCount(studentsCount || 0);
          setDepartment(deptData);
          setFaculty(facultyData || []);
      } catch (err) {
        if (isActive) {
          console.error("Error loading department page:", err);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [deptId, router]);

  /* ================= RENDER ================= */

  return (
      <div className="min-h-screen">

      <div className="max-w-7xl mx-auto space-y-8">
        {/* -------- Top Actions -------- */}
        <div className="flex items-center justify-between">
        {user?.role!="admin"&&(
          <Button
            variant="ghost"
            className="mb-2 -ml-2 inline-flex items-center gap-2"
            onClick={() => router.push("/departments")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all departments
          </Button>
        )}
        
        </div>

        {/* -------- Loading -------- */}
        {loading ? (
          <div className="text-center text-muted-foreground py-16">
            Loading department details...
          </div>
        ) : !department ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Department not found.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* -------- Department Info -------- */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {department.name}
                  </CardTitle>
                  {department.description && (
                    <CardDescription className="mt-3 max-w-2xl">
                      {department.description}
                    </CardDescription>
                  )}
                  
                </div>

                <div className="h-full flex flex-col justify-center items-center gap-2">
                    {isFaculty &&pathName!="/department"&&pathName!="/dashboard"&& (
                        <Button
                        variant="ghost"
                        className="mb-2 inline-flex items-center gap-2"
                        onClick={() => router.push("/department")}
                        >
                        Faculty section
                        <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                
              </CardHeader>
            </Card>
            {/* -------- Department Stats -------- */}
        <div className="grid gap-4 md:grid-cols-3">
        {/* HOD Card */}
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex justify-between items-center">
                Head of Department <UserStar className="w-8 h-8 text-indigo-500"/>
            </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-1">
            {hod ? (
                <>
                <div className="text-xl font-semibold">{hod.name}</div>
                <div className="text-sm text-muted-foreground">
                    ID: {hod.faculty_id}
                </div>
                </>
            ) : (
                <div className="text-sm text-muted-foreground">
                Not assigned
                </div>
            )}
            </CardContent>
        </Card>

        {/* Faculty Count Card */}
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex justify-between items-center">
                Total Faculty <UsersRound className="text-green-500 w-8 h-8"/>
            </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
            <div className="text-4xl font-bold">{faculty.length}</div>
            </CardContent>
        </Card>

        {/* Student Count Card */}
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex justify-between items-center">
                Total Students <GraduationCap  className="text-orange-500 w-8 h-8"/>
            </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
            <div className="text-4xl font-bold">{studentCount}</div>
            </CardContent>
        </Card>
        </div>

            {/* -------- Faculty Table -------- */}
            <Card>
              <CardHeader>
                <CardTitle>Faculty Members</CardTitle>
                <CardDescription>
                  Faculty associated with this department. Only faculty can
                  approve student inventory requests in the secure department
                  panel.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {faculty.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No faculty members listed for this department.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="p-2">
                          <TableHead>FID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody >
                        {faculty.map((f) => (
                          <TableRow key={f.faculty_id} className="p-2">
                            <TableCell className="p-2">{f.faculty_id}</TableCell>
                            <TableCell>{f.name}</TableCell>
                            <TableCell className="text-sm">
                              {f.email ? (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {f.email}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
