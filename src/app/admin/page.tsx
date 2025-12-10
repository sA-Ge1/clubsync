"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
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

  const [clubForm, setClubForm] = useState<Partial<Club>>({});
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [studentForm, setStudentForm] = useState<Partial<Student>>({});
  const [facultyForm, setFacultyForm] = useState<Partial<Faculty>>({});

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
      usn: studentForm.usn,
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
        <div className="flex gap-2">
          <Button onClick={upsertClub} disabled={savingClub}>Save</Button>
          <Button variant="outline" onClick={() => setClubForm({})} disabled={savingClub}>Clear</Button>
        </div>
        <div className="flex">
          <Input
            placeholder="Search by name, id, email"
            value={clubSearch}
            onChange={(e) => setClubSearch(e.target.value)}
            className="max-w-sm"
          />
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
        <div className="flex gap-2">
          <Button onClick={upsertDepartment} disabled={savingDept}>Save</Button>
          <Button variant="outline" onClick={() => setDeptForm({})} disabled={savingDept}>Clear</Button>
        </div>
        <div className="flex">
          <Input
            placeholder="Search by name, id, HOD"
            value={deptSearch}
            onChange={(e) => setDeptSearch(e.target.value)}
            className="max-w-sm"
          />
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
        <div className="flex gap-2">
          <Button onClick={upsertStudent} disabled={savingStudent}>Save</Button>
          <Button variant="outline" onClick={() => setStudentForm({})} disabled={savingStudent}>Clear</Button>
        </div>
        <div className="flex">
          <Input
            placeholder="Search by name, usn, email, dept"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="max-w-sm"
          />
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
        <div className="flex gap-2">
          <Button onClick={upsertFaculty} disabled={savingFaculty}>Save</Button>
          <Button variant="outline" onClick={() => setFacultyForm({})} disabled={savingFaculty}>Clear</Button>
        </div>
        <div className="flex">
          <Input
            placeholder="Search by name, id, email, dept"
            value={facultySearch}
            onChange={(e) => setFacultySearch(e.target.value)}
            className="max-w-sm"
          />
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

