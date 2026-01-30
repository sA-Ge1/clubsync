"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
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

interface Department {
  dept_id: string;
  name: string;
  description: string | null;
  hod: string | null;
}

interface DepartmentRenderProps {
  departments: Department[];
  loadingData: boolean;
  onReload: () => Promise<void>;
  onDownload: () => void;
  title: string;
  description: string;
}

export function DepartmentRender({
  departments,
  loadingData,
  onReload,
  onDownload,
  title,
  description,
}: DepartmentRenderProps) {
  const [deptSearch, setDeptSearch] = useState("");
  const [savingDept, setSavingDept] = useState(false);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [uploadingDepartments, setUploadingDepartments] = useState(false);
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [departmentFile, setDepartmentFile] = useState<File | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const filteredDepartments = departments.filter((d) => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.hod ?? "").toLowerCase().includes(q) ||
      d.dept_id.toLowerCase().includes(q)
    );
  });

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
    if (error) {
      toast.error(error.message);
      setSavingDept(false);
      return;
    }
    toast.success("Department saved");
    setDeptForm({});
    await onReload();
    setSavingDept(false);
  };

  const deleteDepartment = async (id: string) => {
    if (deletingDeptId) return;
    setDeletingDeptId(id);
    const { error } = await supabase.from("departments").delete().eq("dept_id", id);
    if (error) {
      setDeletingDeptId(null);
      toast.error(error.message);
      return;
    }
    toast.success("Department deleted");
    await onReload();
    setDeletingDeptId(null);
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
      await onReload();
      setDepartmentFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload departments");
    } finally {
      setUploadingDepartments(false);
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
              {departments.length}
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Total departments in the system
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
              dept_id, name, hod, description
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
              Export all current departments data as an Excel file for backup or analysis.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div ref={formRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Department ID (blank to create)"
              ref={firstInputRef}
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
            <Button onClick={upsertDepartment} disabled={savingDept}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setDeptForm({})} disabled={savingDept}>
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
                    This overwrites existing data if the department ID already exists and adds new entries.
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
                      setDepartmentFile(files[0] ?? null);
                    }}
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={uploadingDepartments}>Cancel</AlertDialogCancel>
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
                <TableHead>Sl.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>HOD</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((d, i) => (
                <TableRow key={d.dept_id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.hod ?? "-"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                    onClick={() => {
                      setDeptForm(d);
                      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      firstInputRef.current?.focus();
                    }}
                      disabled={savingDept || !!deletingDeptId}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteDepartment(d.dept_id)}
                      disabled={deletingDeptId === d.dept_id}
                    >
                      {deletingDeptId === d.dept_id ? "Deleting..." : "Delete"}
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

