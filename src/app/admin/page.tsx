"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import { useUserInfo } from "@/hooks/useUserInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Upload } from "lucide-react";

type TabKey = "clubs" | "departments" | "students" | "faculty";

interface Club {
  club_id: string;
  name: string;
  description: string | null;
  email: string | null;
  technical: boolean | null;
  faculty_id: string | null;
}

interface Department {
  dept_id: string;
  name: string;
  description: string | null;
  hod: string | null;
}

interface Student {
  usn: string;
  name: string;
  email: string;
  semester: number | null;
  dept_id: string | null;
}

interface Faculty {
  faculty_id: string;
  name: string;
  email: string | null;
  dept_id: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useUserInfo();
  const [activeTab, setActiveTab] = useState<TabKey>("clubs");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [clubSearch, setClubSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [facultySearch, setFacultySearch] = useState("");
  const [savingClub, setSavingClub] = useState(false);
  const [savingDept, setSavingDept] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [deletingFacultyId, setDeletingFacultyId] = useState<string | null>(null);
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [uploadingFaculty, setUploadingFaculty] = useState(false);
  const [uploadingClubs, setUploadingClubs] = useState(false);
  const [uploadingDepartments, setUploadingDepartments] = useState(false);

  const [clubForm, setClubForm] = useState<Partial<Club>>({});
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [studentForm, setStudentForm] = useState<Partial<Student>>({});
  const [facultyForm, setFacultyForm] = useState<Partial<Faculty>>({});

  const [facultyFile, setFacultyFile] = useState<File | null>(null)
  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [clubFile, setClubFile] = useState<File | null>(null)
  const [departmentFile, setDepartmentFile] = useState<File | null>(null)

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      toast.error("Admins only");
      router.push("/");
      return;
    }
    void loadAll();
  }, [loading, user, isAdmin]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      await Promise.all([loadClubs(), loadDepartments(), loadStudents(), loadFaculty()]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadClubs = async () => {
    const { data, error } = await supabase.from("clubs").select("*").order("name");
    if (error) return toast.error(error.message);
    setClubs(data || []);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (error) return toast.error(error.message);
    setDepartments(data || []);
  };

  const loadStudents = async () => {
    const { data, error } = await supabase.from("students").select("*").order("usn");
    if (error) return toast.error(error.message);
    setStudents(data || []);
  };

  const loadFaculty = async () => {
    const { data, error } = await supabase.from("faculty").select("*").order("faculty_id");
    if (error) return toast.error(error.message);
    setFaculty(data || []);
  };

  const upsertClub = async () => {
    if (savingClub) return;
    setSavingClub(true);
    const payload = {
      club_id: clubForm.club_id || undefined,
      name: clubForm.name,
      description: clubForm.description ?? null,
      email: clubForm.email ?? null,
      technical: clubForm.technical ?? null,
      faculty_id: clubForm.faculty_id ?? null,
    };
    if (!payload.name) {
      toast.error("Club name is required");
      setSavingClub(false);
      return;
    }
    const { error } = await supabase.from("clubs").upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Club saved");
    setClubForm({});
    await loadClubs();
    setSavingClub(false);
  };

  const deleteClub = async (id: string) => {
    if (deletingClubId) return;
    setDeletingClubId(id);
    const { error } = await supabase.from("clubs").delete().eq("club_id", id);
    if (error) {
      setDeletingClubId(null);
      return toast.error(error.message);
    }
    toast.success("Club deleted");
    await loadClubs();
    setDeletingClubId(null);
  };

  const upsertDepartment = async () => {
    if (savingDept) return;
    setSavingDept(true);
    const payload = {
      dept_id: deptForm.dept_id || undefined,
      name: deptForm.name,
      description: deptForm.description ?? null,
      hod: deptForm.hod ?? null,
    };
    if (!payload.name) {
      toast.error("Department name is required");
      setSavingDept(false);
      return;
    }
    const { error } = await supabase.from("departments").upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Department saved");
    setDeptForm({});
    await loadDepartments();
    setSavingDept(false);
  };

  const deleteDepartment = async (id: string) => {
    if (deletingDeptId) return;
    setDeletingDeptId(id);
    const { error } = await supabase.from("departments").delete().eq("dept_id", id);
    if (error) {
      setDeletingDeptId(null);
      return toast.error(error.message);
    }
    toast.success("Department deleted");
    await loadDepartments();
    setDeletingDeptId(null);
  };

  const upsertStudent = async () => {
    if (savingStudent) return;
    setSavingStudent(true);
    const payload = {
      usn: studentForm.usn?.toUpperCase(),
      name: studentForm.name,
      email: studentForm.email,
      semester: studentForm.semester ?? null,
      dept_id: studentForm.dept_id ?? null,
    };
    if (!payload.usn || !payload.name || !payload.email) {
      toast.error("USN, name, and email are required");
      setSavingStudent(false);
      return;
    }
    const { error } = await supabase.from("students").upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Student saved");
    setStudentForm({});
    await loadStudents();
    setSavingStudent(false);
  };


  const handleStudentBulkUpload = async () => {
    if (!studentFile) return;

    setUploadingStudents(true);
    try {
      const data = await studentFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: null });

      const payload = rows
        .map((row) => {
          const usnRaw = row.usn ?? row.USN ?? row.Usn;
          const nameRaw = row.name ?? row.Name;
          const emailRaw = row.email ?? row.Email;
          const semRaw = row.semester ?? row.Semester ?? row.sem ?? row.Sem;
          const deptRaw =
            row.dept_id ?? row.dept ?? row.department_id ?? row.DepartmentId;

          const usn = usnRaw ? String(usnRaw).trim().toUpperCase() : "";
          const name = nameRaw ? String(nameRaw).trim() : "";
          const email = emailRaw ? String(emailRaw).trim() : "";
          const semester =
            semRaw !== undefined && semRaw !== null && semRaw !== ""
              ? Number(semRaw)
              : null;
          const dept_id = deptRaw ? String(deptRaw).trim() : null;

          if (!usn || !name || !email) {
            return null;
          }

          return {
            usn,
            name,
            email,
            semester,
            dept_id,
          };
        })
        .filter(Boolean) as {
        usn: string;
        name: string;
        email: string;
        semester: number | null;
        dept_id: string | null;
      }[];

      if (!payload.length) {
        toast.error("No valid student rows found in file");
        return;
      }

      const { error } = await supabase
        .from("students")
        .upsert(payload, { onConflict: "usn" });
      if (error) {
        throw error;
      }

      toast.success(`Uploaded/updated ${payload.length} students`);
      await loadStudents();
      setStudentFile(null); // Clear the file after successful upload
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload students");
    } finally {
      setUploadingStudents(false);
    }
  };

  const deleteStudent = async (usn: string) => {
    if (deletingStudentId) return;
    setDeletingStudentId(usn);
    const { error } = await supabase.from("students").delete().eq("usn", usn);
    if (error) {
      setDeletingStudentId(null);
      return toast.error(error.message);
    }
    toast.success("Student deleted");
    await loadStudents();
    setDeletingStudentId(null);
  };

  const upsertFaculty = async () => {
    if (savingFaculty) return;
    setSavingFaculty(true);
    const payload = {
      faculty_id: facultyForm.faculty_id,
      name: facultyForm.name,
      email: facultyForm.email ?? null,
      dept_id: facultyForm.dept_id ?? null,
    };
    if (!payload.faculty_id || !payload.name) {
      toast.error("Faculty ID and name are required");
      setSavingFaculty(false);
      return;
    }
    const { error } = await supabase.from("faculty").upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Faculty saved");
    setFacultyForm({});
    await loadFaculty();
    setSavingFaculty(false);
  };


  const deleteFaculty = async (id: string) => {
    if (deletingFacultyId) return;
    setDeletingFacultyId(id);
    const { error } = await supabase.from("faculty").delete().eq("faculty_id", id);
    if (error) {
      setDeletingFacultyId(null);
      return toast.error(error.message);
    }
    toast.success("Faculty deleted");
    await loadFaculty();
    setDeletingFacultyId(null);
  };

  const handleFacultyBulkUpload = async () => {
    if (!facultyFile) return;

    setUploadingFaculty(true);
    try {
      const data = await facultyFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: null });

      const payload = rows
        .map((row) => {
          const idRaw =
            row.faculty_id ?? row.FACULTY_ID ?? row.FacultyId ?? row.id;
          const nameRaw = row.name ?? row.Name;
          const emailRaw = row.email ?? row.Email;
          const deptRaw =
            row.dept_id ?? row.dept ?? row.department_id ?? row.DepartmentId;

          const faculty_id = idRaw ? String(idRaw).trim() : "";
          const name = nameRaw ? String(nameRaw).trim() : "";
          const email = emailRaw ? String(emailRaw).trim() : null;
          const dept_id = deptRaw ? String(deptRaw).trim() : null;

          if (!faculty_id || !name) {
            return null;
          }

          return {
            faculty_id,
            name,
            email,
            dept_id,
          };
        })
        .filter(Boolean) as {
        faculty_id: string;
        name: string;
        email: string | null;
        dept_id: string | null;
      }[];

      if (!payload.length) {
        toast.error("No valid faculty rows found in file");
        return;
      }

      const { error } = await supabase
        .from("faculty")
        .upsert(payload, { onConflict: "faculty_id" });
      if (error) {
        throw error;
      }

      toast.success(`Uploaded/updated ${payload.length} faculty records`);
      await loadFaculty();
      setFacultyFile(null); // Clear the file after successful upload
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload faculty");
    } finally {
      setUploadingFaculty(false);
    }
  };

  const handleClubBulkUpload = async () => {
    if (!clubFile) return;

    setUploadingClubs(true);
    try {
      const data = await clubFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: null });

      const payload = rows
        .map((row) => {
          const idRaw = row.club_id ?? row.CLUB_ID ?? row.ClubId ?? row.id;
          const nameRaw = row.name ?? row.Name;
          const emailRaw = row.email ?? row.Email;
          const descRaw = row.description ?? row.Description ?? row.desc;
          const facultyRaw = row.faculty_id ?? row.faculty ?? row.FacultyId;
          const techRaw = row.technical ?? row.Technical ?? row.tech;

          const club_id = idRaw ? String(idRaw).trim() : undefined;
          const name = nameRaw ? String(nameRaw).trim() : "";
          const email = emailRaw ? String(emailRaw).trim() : null;
          const description = descRaw ? String(descRaw).trim() : null;
          const faculty_id = facultyRaw ? String(facultyRaw).trim() : null;
          const technical =
            techRaw !== undefined && techRaw !== null && techRaw !== ""
              ? Boolean(techRaw)
              : null;

          if (!name) {
            return null;
          }

          return {
            club_id,
            name,
            email,
            description,
            faculty_id,
            technical,
          };
        })
        .filter(Boolean) as {
        club_id?: string;
        name: string;
        email: string | null;
        description: string | null;
        faculty_id: string | null;
        technical: boolean | null;
      }[];

      if (!payload.length) {
        toast.error("No valid club rows found in file");
        return;
      }

      const { error } = await supabase
        .from("clubs")
        .upsert(payload, { onConflict: "club_id" });
      if (error) {
        throw error;
      }

      toast.success(`Uploaded/updated ${payload.length} clubs`);
      await loadClubs();
      setClubFile(null); // Clear the file after successful upload
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload clubs");
    } finally {
      setUploadingClubs(false);
    }
  };

  const handleDepartmentBulkUpload = async () => {
    if (!departmentFile) return;

    setUploadingDepartments(true);
    try {
      const data = await departmentFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: null });

      const payload = rows
        .map((row) => {
          const idRaw = row.dept_id ?? row.DEPT_ID ?? row.DeptId ?? row.id;
          const nameRaw = row.name ?? row.Name;
          const hodRaw = row.hod ?? row.HOD ?? row.head ?? row.Head;
          const descRaw = row.description ?? row.Description ?? row.desc;

          const dept_id = idRaw ? String(idRaw).trim() : undefined;
          const name = nameRaw ? String(nameRaw).trim() : "";
          const hod = hodRaw ? String(hodRaw).trim() : null;
          const description = descRaw ? String(descRaw).trim() : null;

          if (!name) {
            return null;
          }

          return {
            dept_id,
            name,
            hod,
            description,
          };
        })
        .filter(Boolean) as {
        dept_id?: string;
        name: string;
        hod: string | null;
        description: string | null;
      }[];

      if (!payload.length) {
        toast.error("No valid department rows found in file");
        return;
      }

      const { error } = await supabase
        .from("departments")
        .upsert(payload, { onConflict: "dept_id" });
      if (error) {
        throw error;
      }

      toast.success(`Uploaded/updated ${payload.length} departments`);
      await loadDepartments();
      setDepartmentFile(null); // Clear the file after successful upload
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload departments");
    } finally {
      setUploadingDepartments(false);
    }
  };

  const filteredClubs = clubs.filter((c) => {
    const q = clubSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      c.club_id.toLowerCase().includes(q)
    );
  });

  const renderClubs = () => (
    <Card>
      <CardHeader>
        <CardTitle>Clubs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Club ID (leave blank to create new)"
            value={clubForm.club_id ?? ""}
            onChange={(e) => setClubForm((p) => ({ ...p, club_id: e.target.value }))}
          />
          <Input
            placeholder="Name *"
            value={clubForm.name ?? ""}
            onChange={(e) => setClubForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            placeholder="Email"
            value={clubForm.email ?? ""}
            onChange={(e) => setClubForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Textarea
            placeholder="Description"
            value={clubForm.description ?? ""}
            onChange={(e) => setClubForm((p) => ({ ...p, description: e.target.value }))}
            className="sm:col-span-2 lg:col-span-3"
          />
          <Input
            placeholder="Faculty ID"
            value={clubForm.faculty_id ?? ""}
            onChange={(e) => setClubForm((p) => ({ ...p, faculty_id: e.target.value }))}
          />
          <Select
            value={
              clubForm.technical === undefined || clubForm.technical === null
                ? ""
                : clubForm.technical
                ? "true"
                : "false"
            }
            onValueChange={(value) =>
              setClubForm((p) => ({
                ...p,
                technical: value === "" ? null : value === "true",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Technical?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Not set</SelectItem>
              <SelectItem value="true">Technical</SelectItem>
              <SelectItem value="false">Non-technical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button onClick={upsertClub} disabled={savingClub}>Save</Button>
          <Button variant="outline" onClick={() => setClubForm({})} disabled={savingClub}>Clear</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline"><Upload/></Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Select and upload CSV / Excel files
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This overwrites existing data if the club ID already exists and adds new entries.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Body */}
              <div className="py-4">
              <FileUpload
                maxFiles={1}
                acceptTypes={[
                  ".csv",
                  "application/vnd.ms-excel",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ]}
                onChange={(files) => {
                  setClubFile(files[0] ?? null)
                }}
              />

              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={uploadingClubs}>
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleClubBulkUpload}
                  disabled={!clubFile || uploadingClubs}
                >
                  {uploadingClubs ? "Uploading..." : "Continue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name, id, email"
            value={clubSearch}
            onChange={(e) => setClubSearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-xs text-muted-foreground">
            Bulk upload supports CSV or Excel with columns like club_id, name, email, description, faculty_id, technical.
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Technical</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClubs.map((c) => (
              <TableRow key={c.club_id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{c.technical ? "Yes" : "No"}</Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setClubForm(c)} disabled={savingClub || !!deletingClubId}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteClub(c.club_id)} disabled={deletingClubId === c.club_id}>
                    {deletingClubId === c.club_id ? "Deleting..." : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const filteredDepartments = departments.filter((d) => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.hod ?? "").toLowerCase().includes(q) ||
      d.dept_id.toLowerCase().includes(q)
    );
  });

  const renderDepartments = () => (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Department ID (blank to create)"
            value={deptForm.dept_id ?? ""}
            onChange={(e) => setDeptForm((p) => ({ ...p, dept_id: e.target.value }))}
          />
          <Input
            placeholder="Name *"
            value={deptForm.name ?? ""}
            onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            placeholder="HOD Faculty ID"
            value={deptForm.hod ?? ""}
            onChange={(e) => setDeptForm((p) => ({ ...p, hod: e.target.value }))}
          />
          <Textarea
            placeholder="Description"
            value={deptForm.description ?? ""}
            onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button onClick={upsertDepartment} disabled={savingDept}>Save</Button>
          <Button variant="outline" onClick={() => setDeptForm({})} disabled={savingDept}>Clear</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline"><Upload/></Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Select and upload CSV / Excel files
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This overwrites existing data if the department ID already exists and adds new entries.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Body */}
              <div className="py-4">
              <FileUpload
                maxFiles={1}
                acceptTypes={[
                  ".csv",
                  "application/vnd.ms-excel",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ]}
                onChange={(files) => {
                  setDepartmentFile(files[0] ?? null)
                }}
              />

              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={uploadingDepartments}>
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleDepartmentBulkUpload}
                  disabled={!departmentFile || uploadingDepartments}
                >
                  {uploadingDepartments ? "Uploading..." : "Continue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name, id, HOD"
            value={deptSearch}
            onChange={(e) => setDeptSearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-xs text-muted-foreground">
            Bulk upload supports CSV or Excel with columns like dept_id, name, hod, description.
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>HOD</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDepartments.map((d) => (
              <TableRow key={d.dept_id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.hod ?? "-"}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDeptForm(d)} disabled={savingDept || !!deletingDeptId}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteDepartment(d.dept_id)} disabled={deletingDeptId === d.dept_id}>
                    {deletingDeptId === d.dept_id ? "Deleting..." : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.usn.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.dept_id ?? "").toLowerCase().includes(q)
    );
  });

  const renderStudents = () => (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="USN *"
            className="uppercase"
            value={studentForm.usn ?? ""}
            onChange={(e) => setStudentForm((p) => ({ ...p, usn: e.target.value }))}
          />
          <Input
            placeholder="Name *"
            value={studentForm.name ?? ""}
            onChange={(e) => setStudentForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            placeholder="Email *"
            value={studentForm.email ?? ""}
            onChange={(e) => setStudentForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            placeholder="Semester"
            value={studentForm.semester ?? ""}
            onChange={(e) =>
              setStudentForm((p) => ({
                ...p,
                semester: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
          <Input
            placeholder="Department ID"
            value={studentForm.dept_id ?? ""}
            className="hidden"
            onChange={() => {}}
          />
          <Select
            value={studentForm.dept_id ?? ""}
            onValueChange={(value) => setStudentForm((p) => ({ ...p, dept_id: value || null }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Not set</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.dept_id} value={d.dept_id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button onClick={upsertStudent} disabled={savingStudent}>Save</Button>
          <Button variant="outline" onClick={() => setStudentForm({})} disabled={savingStudent}>Clear</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline"> <Upload/></Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Select and upload CSV / Excel files
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This overwrites existing data if the USN already exists and adds new entries.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Body */}
              <div className="py-4">
              <FileUpload
                maxFiles={1}
                acceptTypes={[
                  ".csv",
                  "application/vnd.ms-excel",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ]}
                onChange={(files) => {
                  setStudentFile(files[0] ?? null)
                }}
              />

              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={uploadingStudents}>
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleStudentBulkUpload}
                  disabled={!studentFile || uploadingStudents}
                >
                  {uploadingStudents ? "Uploading..." : "Continue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name, usn, email, dept"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-xs text-muted-foreground">
            Bulk upload supports CSV or Excel with columns like usn, name, email, semester, dept_id.
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>USN</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((s) => (
              <TableRow key={s.usn}>
                <TableCell>{s.usn}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.semester ?? "-"}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStudentForm(s)} disabled={savingStudent || !!deletingStudentId}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteStudent(s.usn)} disabled={deletingStudentId === s.usn}>
                    {deletingStudentId === s.usn ? "Deleting..." : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const filteredFaculty = faculty.filter((f) => {
    const q = facultySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      f.faculty_id.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      (f.email ?? "").toLowerCase().includes(q) ||
      (f.dept_id ?? "").toLowerCase().includes(q)
    );
  });

  const renderFaculty = () => (
    <Card>
      <CardHeader>
        <CardTitle>Faculty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Faculty ID *"
            value={facultyForm.faculty_id ?? ""}
            onChange={(e) => setFacultyForm((p) => ({ ...p, faculty_id: e.target.value }))}
          />
          <Input
            placeholder="Name *"
            value={facultyForm.name ?? ""}
            onChange={(e) => setFacultyForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            placeholder="Email"
            value={facultyForm.email ?? ""}
            onChange={(e) => setFacultyForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Select
            value={facultyForm.dept_id ?? ""}
            onValueChange={(value) => setFacultyForm((p) => ({ ...p, dept_id: value || null }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">Not set</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.dept_id} value={d.dept_id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button onClick={upsertFaculty} disabled={savingFaculty}>Save</Button>
          <Button variant="outline" onClick={() => setFacultyForm({})} disabled={savingFaculty}>Clear</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline"><Upload/></Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Select and upload CSV / Excel files
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This overwrites existing data if the ID already exists and adds new entries.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Body */}
              <div className="py-4">
              <FileUpload
                maxFiles={1}
                acceptTypes={[
                  ".csv",
                  "application/vnd.ms-excel",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ]}
                onChange={(files) => {
                  setFacultyFile(files[0] ?? null)
                }}
              />

              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={uploadingFaculty}>
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleFacultyBulkUpload}
                  disabled={!facultyFile || uploadingFaculty}
                >
                  {uploadingFaculty ? "Uploading..." : "Continue"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name, id, email, dept"
            value={facultySearch}
            onChange={(e) => setFacultySearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-xs text-muted-foreground">
            Bulk upload supports CSV or Excel with columns like faculty_id, name, email, dept_id.
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFaculty.map((f) => (
              <TableRow key={f.faculty_id}>
                <TableCell>{f.faculty_id}</TableCell>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.email ?? "-"}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setFacultyForm(f)} disabled={savingFaculty || !!deletingFacultyId}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteFaculty(f.faculty_id)} disabled={deletingFacultyId === f.faculty_id}>
                    {deletingFacultyId === f.faculty_id ? "Deleting..." : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground">Manage clubs, departments, students, and faculty.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="mb-4">
          <TabsTrigger value="clubs">Clubs</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
        </TabsList>

        <TabsContent value="clubs">{renderClubs()}</TabsContent>
        <TabsContent value="departments">{renderDepartments()}</TabsContent>
        <TabsContent value="students">{renderStudents()}</TabsContent>
        <TabsContent value="faculty">{renderFaculty()}</TabsContent>
      </Tabs>
    </div>
  );
}

