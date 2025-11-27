"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft, Mail, ArrowRight } from "lucide-react";
import { useUserInfo } from "@/hooks/useUserInfo";
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

export default function DepartmentPublicPage() {
  const params = useParams();
  const router = useRouter();
  const {user,loading:userLoading} = useUserInfo();
  const deptId = params?.deptId as string;
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFaculty,setIsFaculty]=useState(false);
  useEffect(()=>{
    if(userLoading||!user)
        return;

    setIsFaculty(faculty.some(f => f.faculty_id === user.user_id));
}, [user, userLoading, faculty]);
  
  useEffect(() => {
    if (!deptId) return;
    const fetchData = async () => {
      try {
        setLoading(true);

        const [{ data: deptData }, { data: facultyData }] = await Promise.all([
          supabase
            .from("departments")
            .select("dept_id, name, description")
            .eq("dept_id", deptId)
            .single(),
          supabase
            .from("faculty")
            .select("faculty_id, name, email, dept_id")
            .eq("dept_id", deptId),
        ]);

        if (deptData) {
          setDepartment(deptData as Department);
        }
        setFaculty((facultyData as Faculty[]) || []);
      } catch (err) {
        console.error("Error loading department page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deptId]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
            <Button
                variant="ghost"
                className="mb-2 -ml-2 inline-flex items-center gap-2"
                onClick={() => router.push("/departments")}
                >
                <ArrowLeft className="h-4 w-4" />
                Back to all departments
            </Button>
            {isFaculty&&(
                <Button
                    variant="ghost"
                    className="mb-2 -ml-2 inline-flex items-center gap-2"
                    onClick={() => router.push("/department")}
                    >
                    Faculty section
                    <ArrowRight className="h-4 w-4" />
            </Button>
            )}
            
        </div>

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
                <Badge variant="secondary">Public Department Page</Badge>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Faculty Members</CardTitle>
                <CardDescription>
                  Faculty associated with this department. Only faculty can approve
                  student inventory requests in the secure department panel.
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
                        <TableRow>
                          <TableHead>FID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faculty.map((f) => (
                          <TableRow key={f.faculty_id}>
                            <TableCell>{f.faculty_id}</TableCell>
                            <TableCell>{f.name}</TableCell>
                            <TableCell className="text-sm">
                              {f.email ? (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {f.email}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
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


