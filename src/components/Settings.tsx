"use client"

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Edit, RefreshCw, Search, Settings as SettingsIcon, Database, Shield, Key, Eye, Ban, Trash2, UserCheck, FileText, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface AuthUser {
  id: string;
  email: string;
  role: string;
  student_id: string | null;
  faculty_id: string | null;
  club_id: string | null;
  blocked?: boolean;
  blocked_until?: string | null;
}

interface UserDetails {
  publicAuth: AuthUser | null;
  authUser: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    phone: string | null;
    confirmed_at: string | null;
    user_metadata: any;
    app_metadata: any;
  } | null;
}

interface Student {
  usn: string;
  name: string;
}

interface Faculty {
  faculty_id: string;
  name: string;
}

interface Club {
  club_id: string;
  name: string;
}

interface FundDocumentRow {
  id: string;
  fund_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  is_deleted: boolean;
  funds?: {
    fund_id: string;
    club_id: string;
    name: string | null;
    amount: number | null;
    bill_date: string | null;
    is_credit: boolean;
    type: number;
  } | null;
}

export default function Settings() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [blockingUser, setBlockingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<AuthUser | null>(null);
  const [blockDuration, setBlockDuration] = useState<string>("permanent");

  // Documents (admin)
  const [documents, setDocuments] = useState<FundDocumentRow[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsTab, setDocumentsTab] = useState<"active" | "trash">("active");
  const [documentsSearch, setDocumentsSearch] = useState("");
  const [documentsClubFilter, setDocumentsClubFilter] = useState<string>("all");
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        usersResponse,
        { data: studentsData, error: studentsError },
        { data: facultyData, error: facultyError },
        { data: clubsData, error: clubsError },
      ] = await Promise.all([
        fetch("/api/auth/users-with-status").then((res) => res.json()),
        supabase.from("students").select("usn, name").order("usn"),
        supabase.from("faculty").select("faculty_id, name").order("faculty_id"),
        supabase.from("clubs").select("club_id, name").order("name"),
      ]);

      if (!usersResponse.success) {
        throw new Error(usersResponse.message || "Failed to fetch users");
      }
      if (studentsError) throw studentsError;
      if (facultyError) throw facultyError;
      if (clubsError) throw clubsError;

      setUsers(usersResponse.users || []);
      setStudents(studentsData || []);
      setFaculty(facultyData || []);
      setClubs(clubsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (isDeleted: boolean) => {
    try {
      setDocumentsLoading(true);
      const { data, error } = await supabase
        .from("fund_documents")
        .select(
          `
          id,
          fund_id,
          file_name,
          file_path,
          mime_type,
          file_size,
          uploaded_by,
          created_at,
          is_deleted,
          funds:fund_id (
            fund_id,
            club_id,
            name,
            amount,
            bill_date,
            is_credit,
            type
          )
        `
        )
        .eq("is_deleted", isDeleted)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error(error.message || "Failed to load documents");
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    // Load documents only when tab is used; harmless to prefetch once too.
    fetchDocuments(documentsTab === "trash");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentsTab]);

  const filteredDocuments = useMemo(() => {
    const q = documentsSearch.trim().toLowerCase();
    return documents.filter((d) => {
      const clubId = d.funds?.club_id || "";
      if (documentsClubFilter !== "all" && clubId !== documentsClubFilter) return false;

      if (!q) return true;

      const clubName = clubs.find((c) => c.club_id === clubId)?.name || "";
      const fundName = d.funds?.name || "";
      const typeStr = String(d.funds?.type ?? "");
      const amountStr = String(d.funds?.amount ?? "");
      return (
        d.file_name.toLowerCase().includes(q) ||
        d.file_path.toLowerCase().includes(q) ||
        clubId.toLowerCase().includes(q) ||
        clubName.toLowerCase().includes(q) ||
        fundName.toLowerCase().includes(q) ||
        typeStr.includes(q) ||
        amountStr.includes(q)
      );
    });
  }, [documents, documentsSearch, documentsClubFilter, clubs]);

  const openSignedDocument = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("fund-documents")
        .createSignedUrl(filePath, 60 * 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      console.error("Error opening signed document:", error);
      toast.error(error.message || "Failed to open document");
    }
  };

  const softDeleteDocument = async (id: string) => {
    if (documentActionId) return;
    setDocumentActionId(id);
    try {
      const { error } = await supabase
        .from("fund_documents")
        .update({ is_deleted: true })
        .eq("id", id);
      if (error) throw error;
      toast.success("Document moved to recycle bin");
      await fetchDocuments(false);
    } catch (error: any) {
      console.error("Error trashing document:", error);
      toast.error(error.message || "Failed to trash document");
    } finally {
      setDocumentActionId(null);
    }
  };

  const restoreDocument = async (id: string) => {
    if (documentActionId) return;
    setDocumentActionId(id);
    try {
      const { error } = await supabase
        .from("fund_documents")
        .update({ is_deleted: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Document restored");
      await fetchDocuments(true);
    } catch (error: any) {
      console.error("Error restoring document:", error);
      toast.error(error.message || "Failed to restore document");
    } finally {
      setDocumentActionId(null);
    }
  };

  const permanentlyDeleteDocument = async (doc: FundDocumentRow) => {
    if (documentActionId) return;
    setDocumentActionId(doc.id);
    try {
      const { error: storageError } = await supabase.storage
        .from("fund-documents")
        .remove([doc.file_path]);
      if (storageError) throw storageError;

      const { error } = await supabase.from("fund_documents").delete().eq("id", doc.id);
      if (error) throw error;

      toast.success("Document permanently deleted");
      await fetchDocuments(true);
    } catch (error: any) {
      console.error("Error permanently deleting document:", error);
      toast.error(error.message || "Failed to permanently delete document");
    } finally {
      setDocumentActionId(null);
    }
  };

  const emptyRecycleBin = async () => {
    if (documentActionId) return;
    setDocumentActionId("__empty__");
    try {
      const trashed = documents;
      if (trashed.length === 0) {
        toast.info("Recycle bin is already empty");
        return;
      }

      const paths = trashed.map((d) => d.file_path);
      const { error: storageError } = await supabase.storage
        .from("fund-documents")
        .remove(paths);
      if (storageError) throw storageError;

      const ids = trashed.map((d) => d.id);
      const { error } = await supabase.from("fund_documents").delete().in("id", ids);
      if (error) throw error;

      toast.success("Recycle bin emptied");
      await fetchDocuments(true);
    } catch (error: any) {
      console.error("Error emptying recycle bin:", error);
      toast.error(error.message || "Failed to empty recycle bin");
    } finally {
      setDocumentActionId(null);
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.student_id && user.student_id.toLowerCase().includes(query)) ||
      (user.faculty_id && user.faculty_id.toLowerCase().includes(query)) ||
      (user.club_id && user.club_id.toLowerCase().includes(query))
    );
  });

  // Handle edit user
  const handleEditUser = (user: AuthUser) => {
    setEditingUser({ ...user });
  };

  // Save user changes
  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);

      // Validate that only one ID is set based on role
      if (editingUser.role === "student" && !editingUser.student_id) {
        toast.error("Student ID is required for student role");
        return;
      }
      if (editingUser.role === "faculty" && !editingUser.faculty_id) {
        toast.error("Faculty ID is required for faculty role");
        return;
      }
      if (editingUser.role === "club" && !editingUser.club_id) {
        toast.error("Club ID is required for club role");
        return;
      }

      // Clear unrelated IDs based on role
      const updateData: any = {
        role: editingUser.role,
        student_id: editingUser.role === "student" ? editingUser.student_id : null,
        faculty_id: editingUser.role === "faculty" ? editingUser.faculty_id : null,
        club_id: editingUser.role === "club" ? editingUser.club_id : null,
      };

      // For admin, clear all IDs
      if (editingUser.role === "admin") {
        updateData.student_id = null;
        updateData.faculty_id = null;
        updateData.club_id = null;
      }

      const { error } = await supabase
        .from("auth")
        .update(updateData)
        .eq("id", editingUser.id);

      if (error) throw error;

      toast.success("User updated successfully");
      setEditingUser(null);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // Send password reset email
  const handleSendResetEmail = async (email: string) => {
    try {
      setSendingReset(email);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      toast.success(`Password reset email sent to ${email}`);
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setSendingReset(null);
    }
  };

  // Get display name for linked entity
  const getLinkedEntityName = (user: AuthUser): string => {
    if (user.student_id) {
      const student = students.find((s) => s.usn === user.student_id);
      return student ? `${student.name} (${student.usn})` : user.student_id;
    }
    if (user.faculty_id) {
      const facultyMember = faculty.find((f) => f.faculty_id === user.faculty_id);
      return facultyMember ? `${facultyMember.name} (${facultyMember.faculty_id})` : user.faculty_id;
    }
    if (user.club_id) {
      const club = clubs.find((c) => c.club_id === user.club_id);
      return club ? `${club.name} (${club.club_id})` : user.club_id;
    }
    return "Not linked";
  };

  // Get role badge color
  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "student":
        return "default";
      case "faculty":
        return "secondary";
      case "club":
        return "outline";
      default:
        return "outline";
    }
  };

  // View user details
  const handleViewDetails = async (userId: string) => {
    try {
      setViewingUser(userId);
      setLoadingDetails(true);
      setUserDetails(null);

      const response = await fetch("/api/auth/user-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch user details");
      }

      setUserDetails(data.data);
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      toast.error(error.message || "Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open block dialog
  const handleOpenBlockDialog = (user: AuthUser) => {
    setUserToBlock(user);
    setBlockDialogOpen(true);
    setBlockDuration("permanent");
  };

  // Block/Unblock user
  const handleBlockUser = async (blocked: boolean, duration?: string) => {
    if (!userToBlock) return;

    try {
      setBlockingUser(userToBlock.id);

      const response = await fetch("/api/auth/block-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: userToBlock.id, 
          blocked,
          duration: blocked ? (duration || "permanent") : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to block/unblock user");
      }

      const durationText = blocked && duration && duration !== "permanent" 
        ? ` for ${duration}` 
        : blocked 
        ? " permanently" 
        : "";
      
      toast.success(blocked ? `User blocked${durationText} successfully` : "User unblocked successfully");
      setBlockDialogOpen(false);
      setUserToBlock(null);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error blocking/unblocking user:", error);
      toast.error(error.message || "Failed to block/unblock user");
    } finally {
      setBlockingUser(null);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeletingUser(userToDelete.id);

      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setDeletingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <span className="text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage users, roles, and system configuration.</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="mr-2 h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts, roles, and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, role, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sl.No</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Linked Entity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user,i) => (
                        <TableRow key={user.id}>
                          <TableCell>{i+1}</TableCell>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {user.blocked ? (
                              <Badge variant="destructive">Blocked</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getLinkedEntityName(user)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetails(user.id)}
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                                {user.blocked ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setUserToBlock(user);
                                      handleBlockUser(false);
                                    }}
                                    disabled={blockingUser === user.id}
                                  >
                                    {blockingUser === user.id ? (
                                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <UserCheck className="mr-1 h-3 w-3" />
                                    )}
                                    Unblock
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenBlockDialog(user)}
                                    disabled={blockingUser === user.id}
                                  >
                                    <Ban className="mr-1 h-3 w-3" />
                                    Block
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendResetEmail(user.email)}
                                  disabled={sendingReset === user.email}
                                >
                                  {sendingReset === user.email ? (
                                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Mail className="mr-1 h-3 w-3" />
                                  )}
                                  Reset
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  disabled={deletingUser === user.id}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                              {user.blocked && (
                                <div className="text-xs text-muted-foreground">
                                  {user.blocked_until ? (
                                    <>Blocked until: {new Date(user.blocked_until).toLocaleString()}</>
                                  ) : (
                                    <>Permanently blocked</>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-muted-foreground">
                Total users: {users.length} | Filtered: {filteredUsers.length}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Fund Documents</CardTitle>
                <CardDescription>
                  View, search, trash/restore, and permanently delete supporting fund documents.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    size="sm"
                    variant={documentsTab === "active" ? "default" : "ghost"}
                    onClick={() => setDocumentsTab("active")}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant={documentsTab === "trash" ? "default" : "ghost"}
                    onClick={() => setDocumentsTab("trash")}
                  >
                    Recycle Bin
                  </Button>
                </div>
                {documentsTab === "trash" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={documentsLoading || documentActionId === "__empty__"}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Empty Bin
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Empty recycle bin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all trashed documents, including the files from the storage bucket.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={emptyRecycleBin} className="bg-red-600 hover:bg-red-700">
                          Empty Bin
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchDocuments(documentsTab === "trash")}
                  disabled={documentsLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${documentsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 w-full sm:max-w-md">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents by name, club, fund, amount, type..."
                    value={documentsSearch}
                    onChange={(e) => setDocumentsSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={documentsClubFilter} onValueChange={setDocumentsClubFilter}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Filter by club" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clubs</SelectItem>
                      {clubs.map((c) => (
                        <SelectItem key={c.club_id} value={c.club_id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sl.No</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Loading documents...
                        </TableCell>
                      </TableRow>
                    ) : filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No documents found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc,i) => {
                        const clubId = doc.funds?.club_id || "-";
                        const clubName = clubs.find((c) => c.club_id === clubId)?.name || clubId;
                        const fundLabel = doc.funds?.name || doc.fund_id;
                        return (
                          <TableRow key={doc.id}>
                            <TableCell>{i+1}</TableCell>
                            <TableCell className="font-medium max-w-[320px]">
                              <div className="min-w-0">
                                <p className="truncate">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{doc.file_path}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <p className="truncate">{clubName}</p>
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <p className="truncate">{fundLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.funds?.amount != null ? `₹${doc.funds.amount}` : "-"}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(doc.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => openSignedDocument(doc.file_path)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Button>

                                {documentsTab === "active" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 hover:text-red-600"
                                    disabled={documentActionId === doc.id}
                                    onClick={() => softDeleteDocument(doc.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Trash
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={documentActionId === doc.id}
                                      onClick={() => restoreDocument(doc.id)}
                                    >
                                      <RotateCcw className="mr-2 h-4 w-4" />
                                      Restore
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive" disabled={documentActionId === doc.id}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Permanently delete document?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will delete the file from the private bucket and remove its metadata record.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => permanentlyDeleteDocument(doc)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Permanently Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-muted-foreground">
                Total: {documents.length} | Filtered: {filteredDocuments.length}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Users:</span>
                  <span className="font-medium">{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Students:</span>
                  <span className="font-medium">{students.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Faculty:</span>
                  <span className="font-medium">{faculty.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Clubs:</span>
                  <span className="font-medium">{clubs.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    User authentication is handled by Supabase Auth. Password reset emails are sent through Supabase's email service.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All user data is stored in the <code className="text-xs bg-muted px-1 py-0.5 rounded">public.auth</code> table.
                  </p>
                </div>
                <Button variant="outline" onClick={fetchAllData} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Role Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Admin</div>
                  <p className="text-sm text-muted-foreground">
                    Full system access. No linked entity required.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Student</div>
                  <p className="text-sm text-muted-foreground">
                    Must be linked to a student record via <code className="text-xs bg-muted px-1 py-0.5 rounded">student_id</code>.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Faculty</div>
                  <p className="text-sm text-muted-foreground">
                    Must be linked to a faculty record via <code className="text-xs bg-muted px-1 py-0.5 rounded">faculty_id</code>.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Club</div>
                  <p className="text-sm text-muted-foreground">
                    Must be linked to a club record via <code className="text-xs bg-muted px-1 py-0.5 rounded">club_id</code>.
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Not Set</div>
                  <p className="text-sm text-muted-foreground">
                    Default role for new users. No access until role is assigned.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user role and linked entity information.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={editingUser.email} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role *</label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value, student_id: null, faculty_id: null, club_id: null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notset">Not Set</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingUser.role === "student" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student ID *</label>
                  <Select
                    value={editingUser.student_id || ""}
                    onValueChange={(value) => setEditingUser({ ...editingUser, student_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.usn} value={student.usn}>
                          {student.name} ({student.usn})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingUser.role === "faculty" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Faculty ID *</label>
                  <Select
                    value={editingUser.faculty_id || ""}
                    onValueChange={(value) => setEditingUser({ ...editingUser, faculty_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map((facultyMember) => (
                        <SelectItem key={facultyMember.faculty_id} value={facultyMember.faculty_id}>
                          {facultyMember.name} ({facultyMember.faculty_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingUser.role === "club" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Club ID *</label>
                  <Select
                    value={editingUser.club_id || ""}
                    onValueChange={(value) => setEditingUser({ ...editingUser, club_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select club" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubs.map((club) => (
                        <SelectItem key={club.club_id} value={club.club_id}>
                          {club.name} ({club.club_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete user information and account details</DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : userDetails ? (
            <div className="space-y-6 py-4">
              {/* Account Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Account Information</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{userDetails.publicAuth?.email || userDetails.authUser?.email || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <p className="text-sm">
                      <Badge variant={getRoleBadgeVariant(userDetails.publicAuth?.role || "notset")}>
                        {userDetails.publicAuth?.role || "notset"}
                      </Badge>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-sm font-mono text-xs break-all">{userDetails.publicAuth?.id || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm">
                      {userDetails.publicAuth?.blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              {userDetails.authUser && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Account Timestamps</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                      <p className="text-sm">
                        {userDetails.authUser.created_at
                          ? new Date(userDetails.authUser.created_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                      <p className="text-sm">
                        {userDetails.authUser.last_sign_in_at
                          ? new Date(userDetails.authUser.last_sign_in_at).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Email Confirmed</label>
                      <p className="text-sm">
                        {userDetails.authUser.email_confirmed_at
                          ? new Date(userDetails.authUser.email_confirmed_at).toLocaleString()
                          : "Not confirmed"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-sm">{userDetails.authUser.phone || "Not set"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Entity */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Linked Entity</h3>
                <div className="space-y-2">
                  {userDetails.publicAuth?.student_id && (
                    <div className="p-3 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                      <p className="text-sm font-medium">{getLinkedEntityName(userDetails.publicAuth)}</p>
                    </div>
                  )}
                  {userDetails.publicAuth?.faculty_id && (
                    <div className="p-3 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Faculty ID</label>
                      <p className="text-sm font-medium">{getLinkedEntityName(userDetails.publicAuth)}</p>
                    </div>
                  )}
                  {userDetails.publicAuth?.club_id && (
                    <div className="p-3 border rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Club ID</label>
                      <p className="text-sm font-medium">{getLinkedEntityName(userDetails.publicAuth)}</p>
                    </div>
                  )}
                  {!userDetails.publicAuth?.student_id &&
                    !userDetails.publicAuth?.faculty_id &&
                    !userDetails.publicAuth?.club_id && (
                      <p className="text-sm text-muted-foreground">No linked entity</p>
                    )}
                </div>
              </div>

              {/* Metadata */}
              {userDetails.authUser?.user_metadata && Object.keys(userDetails.authUser.user_metadata).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">User Metadata</h3>
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(userDetails.authUser.user_metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* All Data */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">All Data (JSON)</h3>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <pre className="text-xs overflow-auto max-h-60">
                    {JSON.stringify(userDetails, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No data available</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Block user account for <strong>{userToBlock?.email}</strong>. Select the duration for the block.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Block Duration</label>
              <Select value={blockDuration} onValueChange={setBlockDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">1 Day</SelectItem>
                  <SelectItem value="168h">1 Week</SelectItem>
                  <SelectItem value="720h">1 Month (30 days)</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {blockDuration === "permanent" 
                  ? "User will be blocked indefinitely until manually unblocked."
                  : `User will be blocked for ${blockDuration === "1h" ? "1 hour" : blockDuration === "24h" ? "1 day" : blockDuration === "168h" ? "1 week" : "1 month"} and will be automatically unblocked after the duration.`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleBlockUser(true, blockDuration)}
              disabled={!!blockingUser}
              variant="destructive"
            >
              {blockingUser ? "Blocking..." : "Block User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for{" "}
              <strong>{userToDelete?.email}</strong> and remove all associated data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={!!deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

