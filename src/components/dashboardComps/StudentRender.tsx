"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { Upload, Download, FileSpreadsheet, ChartColumnIncreasing } from "lucide-react";

interface Student {
  usn: string;
  name: string;
  email: string;
  semester: number | null;
  dept_id: string | null;
}

interface Department {
  dept_id: string;
  name: string;
}

interface StudentRenderProps {
  students: Student[];
  departments: Department[];
  loadingData: boolean;
  onReload: () => Promise<void>;
  onDownload: () => void;
  title: string;
  description: string;
}

export function StudentRender({
  students,
  departments,
  loadingData,
  onReload,
  onDownload,
  title,
  description,
}: StudentRenderProps) {
  const [studentSearch, setStudentSearch] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [studentForm, setStudentForm] = useState<Partial<Student>>({});
  const [studentFile, setStudentFile] = useState<File | null>(null);

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
    if (error) {
      toast.error(error.message);
      setSavingStudent(false);
      return;
    }
    toast.success("Student saved");
    setStudentForm({});
    await onReload();
    setSavingStudent(false);
  };

  const deleteStudent = async (usn: string) => {
    if (deletingStudentId) return;
    setDeletingStudentId(usn);
    const { error } = await supabase.from("students").delete().eq("usn", usn);
    if (error) {
      setDeletingStudentId(null);
      toast.error(error.message);
      return;
    }
    toast.success("Student deleted");
    await onReload();
    setDeletingStudentId(null);
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
      await onReload();
      setStudentFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload students");
    } finally {
      setUploadingStudents(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Three Cards Section */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Stats Card */}
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center gap-3 pb-2 flex-shrink-0">
            <ChartColumnIncreasing className="h-14 w-14 text-red-500 flex-shrink-0" />
            <CardTitle className="text-xl font-medium">Total Count</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[80px]">
            <div className="text-5xl text-center w-full font-bold">
              {students.length}
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Total students registered in the system
            </p>
          </div>
        </Card>

        {/* Upload Format Card */}
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center gap-3 pb-2 flex-shrink-0">
            <FileSpreadsheet className="h-14 w-14 text-green-500 flex-shrink-0" />
            <CardTitle className="text-xl font-medium">Upload Format</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center min-h-[80px]">
            <div className="text-xs font-mono bg-muted p-2 rounded break-words text-center w-full">
              usn, name, email, semester, dept_id
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Required columns for CSV/Excel bulk upload. Supports .csv and .xlsx formats.
            </p>
          </div>
        </Card>

        {/* Download Card */}
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center gap-3 pb-2 flex-shrink-0">
            <Download className="h-14 w-14 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-xl font-medium">Export Data</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center min-h-[80px]">
            <Button
              onClick={onDownload}
              variant="outline"
              className="w-auto"
              disabled={loadingData}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
          </CardContent>
          <div className="px-6 pb-6 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Export all current students data as an Excel file for backup or analysis.
            </p>
          </div>
        </Card>
      </div>

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
            <Button onClick={upsertStudent} disabled={savingStudent}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setStudentForm({})} disabled={savingStudent}>
              Clear
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Upload />
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Select and upload CSV / Excel files</AlertDialogTitle>
                  <AlertDialogDescription>
                    This overwrites existing data if the USN already exists and adds new entries.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                  <FileUpload
                    maxFiles={1}
                    acceptTypes={[
                      ".csv",
                      "application/vnd.ms-excel",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ]}
                    onChange={(files) => {
                      setStudentFile(files[0] ?? null);
                    }}
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={uploadingStudents}>Cancel</AlertDialogCancel>
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
                <TableHead>Sl.no</TableHead>
                <TableHead>USN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((s, i) => (
                <TableRow key={s.usn}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.usn}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.semester ?? "-"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStudentForm(s)}
                      disabled={savingStudent || !!deletingStudentId}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteStudent(s.usn)}
                      disabled={deletingStudentId === s.usn}
                    >
                      {deletingStudentId === s.usn ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

