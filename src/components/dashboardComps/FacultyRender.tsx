"use client";

import { useRef, useState } from "react";
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

interface Faculty {
  faculty_id: string;
  name: string;
  email: string | null;
  dept_id: string | null;
}

interface Department {
  dept_id: string;
  name: string;
}

interface FacultyRenderProps {
  faculty: Faculty[];
  departments: Department[];
  loadingData: boolean;
  onReload: () => Promise<void>;
  onDownload: () => void;
  title: string;
  description: string;
}

export function FacultyRender({
  faculty,
  departments,
  loadingData,
  onReload,
  onDownload,
  title,
  description,
}: FacultyRenderProps) {
  const [facultySearch, setFacultySearch] = useState("");
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [deletingFacultyId, setDeletingFacultyId] = useState<string | null>(null);
  const [uploadingFaculty, setUploadingFaculty] = useState(false);
  const [facultyForm, setFacultyForm] = useState<Partial<Faculty>>({});
  const [facultyFile, setFacultyFile] = useState<File | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

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
    if (error) {
      toast.error(error.message);
      setSavingFaculty(false);
      return;
    }
    toast.success("Faculty saved");
    setFacultyForm({});
    await onReload();
    setSavingFaculty(false);
  };

  const deleteFaculty = async (id: string) => {
    if (deletingFacultyId) return;
    setDeletingFacultyId(id);
    const { error } = await supabase.from("faculty").delete().eq("faculty_id", id);
    if (error) {
      setDeletingFacultyId(null);
      toast.error(error.message);
      return;
    }
    toast.success("Faculty deleted");
    await onReload();
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
      await onReload();
      setFacultyFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload faculty");
    } finally {
      setUploadingFaculty(false);
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
              {faculty.length}
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Total faculty members in the system
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
              faculty_id, name, email, dept_id
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
              Export all current faculty data as an Excel file for backup or analysis.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faculty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={formRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Faculty ID *"
              ref={firstInputRef}
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
            <Button onClick={upsertFaculty} disabled={savingFaculty}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setFacultyForm({})} disabled={savingFaculty}>
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
                    This overwrites existing data if the ID already exists and adds new entries.
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
                      setFacultyFile(files[0] ?? null);
                    }}
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={uploadingFaculty}>Cancel</AlertDialogCancel>
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
                <TableHead>Sl.no</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaculty.map((f, i) => (
                <TableRow key={f.faculty_id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{f.faculty_id}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.email ?? "-"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                    onClick={() => {
                      setFacultyForm(f);
                      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      firstInputRef.current?.focus();
                    }}
                      disabled={savingFaculty || !!deletingFacultyId}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteFaculty(f.faculty_id)}
                      disabled={deletingFacultyId === f.faculty_id}
                    >
                      {deletingFacultyId === f.faculty_id ? "Deleting..." : "Delete"}
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

