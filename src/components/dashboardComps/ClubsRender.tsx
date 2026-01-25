"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
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

interface Club {
  club_id: string;
  name: string;
  description: string | null;
  email: string | null;
  technical: boolean | null;
  faculty_id: string | null;
}

interface ClubsRenderProps {
  clubs: Club[];
  loadingData: boolean;
  onReload: () => Promise<void>;
  onDownload: () => void;
  title: string;
  description: string;
}

export function ClubsRender({
  clubs,
  loadingData,
  onReload,
  onDownload,
  title,
  description,
}: ClubsRenderProps) {
  const [clubSearch, setClubSearch] = useState("");
  const [savingClub, setSavingClub] = useState(false);
  const [deletingClubId, setDeletingClubId] = useState<string | null>(null);
  const [uploadingClubs, setUploadingClubs] = useState(false);
  const [clubForm, setClubForm] = useState<Partial<Club>>({});
  const [clubFile, setClubFile] = useState<File | null>(null);

  const filteredClubs = clubs.filter((c) => {
    const q = clubSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      c.club_id.toLowerCase().includes(q)
    );
  });

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
    if (error) {
      toast.error(error.message);
      setSavingClub(false);
      return;
    }
    toast.success("Club saved");
    setClubForm({});
    await onReload();
    setSavingClub(false);
  };

  const deleteClub = async (id: string) => {
    if (deletingClubId) return;
    setDeletingClubId(id);
    const { error } = await supabase.from("clubs").delete().eq("club_id", id);
    if (error) {
      setDeletingClubId(null);
      toast.error(error.message);
      return;
    }
    toast.success("Club deleted");
    await onReload();
    setDeletingClubId(null);
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
      await onReload();
      setClubFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to upload clubs");
    } finally {
      setUploadingClubs(false);
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
              {clubs.length}
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Total clubs registered in the system
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
              club_id, name, email, description, faculty_id, technical
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
              Export all current clubs data as an Excel file for backup or analysis.
            </p>
          </div>
        </Card>
      </div>

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
            <Button onClick={upsertClub} disabled={savingClub}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setClubForm({})} disabled={savingClub}>
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
                    This overwrites existing data if the club ID already exists and adds new entries.
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
                      setClubFile(files[0] ?? null);
                    }}
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={uploadingClubs}>Cancel</AlertDialogCancel>
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
                <TableHead>Sl.no</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Technical</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClubs.map((c, i) => (
                <TableRow key={c.club_id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.technical ? "Yes" : "No"}</Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setClubForm(c)}
                      disabled={savingClub || !!deletingClubId}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteClub(c.club_id)}
                      disabled={deletingClubId === c.club_id}
                    >
                      {deletingClubId === c.club_id ? "Deleting..." : "Delete"}
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

