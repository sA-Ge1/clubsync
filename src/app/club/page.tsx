"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserInfo } from "@/hooks/useUserInfo";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Users,
  Package,
  FileCheck,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  Search,
  ArrowUpDown,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
type TabType = "members" | "inventory" | "requests";

interface Member {
  member_id: string;
  usn: string;
  name: string;
  email: string;
  role: string;
}

interface InventoryItem {
  inventory_id: string;
  name: string;
  description: string;
  quantity: number;
  cost: number;
  image: string | null;
  is_public: boolean;
}

interface Transaction {
  transaction_id: string;
  student_id: string | null;
  borrower_club_id: string | null;
  borrower_club_email:string|null;
  inventory_id: string;
  quantity: number;
  date_of_issue: string;
  due_date: string;
  status: string;
  message: string;
  name?: string;
  inventory_name?: string;
  updated_at: string;
}

interface StudentInfo {
  usn: string;
  name: string;
  email: string;
  semester?: number;
  dept_id?: string;
  department_name?: string;
}


export default function ClubPage() {
  const { user, loading: userLoading } = useUserInfo();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [clubData, setClubData] = useState<any>(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<Transaction[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Member management states
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMemberUSN, setNewMemberUSN] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("new member");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role">("name");
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Inventory management states
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    image:"",
    description: "",
    quantity: 0,
    cost: 0,
    is_public: true,
  });

  const [isDeletingMembers, setIsDeletingMembers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isDeletingInventory, setIsDeletingInventory] = useState("");
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  
  // Request detail dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);
  const [editingMessage, setEditingMessage] = useState("");
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }

    if (user.role !== "club" || !user.user_id || user.user_id === "notset") {
      toast.error("You don't have access to club management");
      router.push("/");
      return;
    }

    fetchClubData();
  }, [user, userLoading]);

  const fetchClubData = async () => {
    try {
      setClubLoading(true);

      // Fetch club data
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("*")
        .eq("club_id", user?.user_id)
        .single();

      if (clubError) {
        toast.error("Failed to fetch club data");
        console.error(clubError);
        return;
      }

      setClubData(club);

      // Check if user email matches club email (for first-time setup)
      if (club.email && user?.email === club.email) {
        setIsAuthorized(true);
      } else if (!club.email) {
        // First user setup - allow if no email set yet
        setIsAuthorized(true);
      } else {
        toast.error("Your email doesn't match the club email");
        router.push("/");
        return;
      }

      // Fetch members
      await fetchMembers(club.club_id);
      // Fetch inventory
      await fetchInventory(club.club_id);
      // Fetch requests
      await fetchRequests(club.club_id);
    } catch (error) {
      console.error("Error fetching club data:", error);
      toast.error("An error occurred");
    } finally {
      setClubLoading(false);
    }
  };

  const fetchMembers = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          member_id,
          usn,
          role,
          students:usn (
            name,
            email
          )
        `)
        .eq("club_id", clubId);

      if (error) throw error;

      const formattedMembers: Member[] = (data || []).map((m: any) => ({
        member_id: m.member_id,
        usn: m.usn,
        name: m.students?.name || "Unknown",
        email: m.students?.email || "",
        role: (m.role || "New Member"),
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    }
  };

  const fetchInventory = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("club_id", clubId)
        .order("name");

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory");
    }
  };

  const fetchRequests = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          students:student_id (
            name
          ),
          inventory:inventory_id (
            name,
            club_id
          ),
          clubs:borrower_club_id(
            name,
            email
          )
        `)
        .order("date_of_issue", { ascending: false });

      if (error) throw error;

      // Filter transactions where the inventory belongs to this club
      const filteredData = (data || []).filter((t: any) => 
        t.inventory?.club_id === clubId
      );

      const formattedRequests: Transaction[] = filteredData.map((t: any) => ({
        ...t,
        name: t.students?.name || t.clubs?.name||"-",
        inventory_name: t.inventory?.name || "Unknown",
        borrower_club_email: t.clubs?.email||"Not found",
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUSN.trim() || !clubData) {
      toast.error("Please enter a valid USN");
      return;
    }
    setIsAddingMember(true);
    try {
      // Check if student exists
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("usn, name, email")
        .eq("usn", newMemberUSN.trim().toUpperCase())
        .single();

      if (studentError || !student) {
        toast.error("Student not found");
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("memberships")
        .select("member_id")
        .eq("club_id", clubData.club_id)
        .eq("usn", newMemberUSN.trim().toUpperCase())
        .single();

      if (existing) {
        toast.error("Student is already a member");
        return;
      }

      // Add member
      const { error } = await supabase.from("memberships").insert({
        club_id: clubData.club_id,
        usn: newMemberUSN.trim().toUpperCase(),
        role: newMemberRole,
      });

      if (error) throw error;

      toast.success("Member added successfully");
      setNewMemberUSN("");
      setNewMemberRole("New Member");
      setMemberDialogOpen(false);
      fetchMembers(clubData.club_id);
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Failed to add member");
    }
    setIsAddingMember(false);
  };

  const handleBulkRemoveMembers = async () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select members to remove");
      return;
    }
    
    if (!clubData) return;
    setIsDeletingMembers(true);
    try {
      const { error } = await supabase
        .from("memberships")
        .delete()
        .in("member_id", Array.from(selectedMembers));

      if (error) throw error;

      toast.success(`Removed ${selectedMembers.size} member(s)`);
      setSelectedMembers(new Set());
      fetchMembers(clubData.club_id);
    } catch (error: any) {
      console.error("Error removing members:", error);
      toast.error(error.message || "Failed to remove members");
    }
    setIsDeletingMembers(false);
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!clubData) return;

    setUpdatingRole(memberId);
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole })
        .eq("member_id", memberId);

      if (error) throw error;

      toast.success("Role updated successfully");
      fetchMembers(clubData.club_id);
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  // Role hierarchy for sorting
  const roleOrder: Record<string, number> = {
    "team lead": 1,
    "co lead": 2,
    "core member": 3,
    "member": 4,
    "new member": 5,
  };

  // Filter and sort members
  const filteredAndSortedMembers = members
    .filter((member) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        member.usn.toLowerCase().includes(query) ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by role hierarchy
        const roleA = roleOrder[a.role.toLowerCase()] || 999;
        const roleB = roleOrder[b.role.toLowerCase()] || 999;
        if (roleA !== roleB) {
          return roleA - roleB;
        }
        // If same role, sort by name
        return a.name.localeCompare(b.name);
      }
    });

  const handleSaveInventory = async () => {
    if (!inventoryForm.name.trim() || !clubData) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsUpdatingInventory(true);
    try {
      if (editingInventory) {
        // Update existing
        const { error } = await supabase
          .from("inventory")
          .update({
            name: inventoryForm.name,
            image: inventoryForm.image,
            description: inventoryForm.description,
            quantity: inventoryForm.quantity,
            cost: inventoryForm.cost,
            is_public: inventoryForm.is_public,
          })
          .eq("inventory_id", editingInventory.inventory_id);

        if (error) throw error;
        toast.success("Inventory item updated");
      } else {
        // Create new
        const { error } = await supabase.from("inventory").insert({
          club_id: clubData.club_id,
          ...inventoryForm,
        });

        if (error) throw error;
        toast.success("Inventory item added");
      }

      setInventoryDialogOpen(false);
      setEditingInventory(null);
      setInventoryForm({
        name: "",
        image:"",
        description: "",
        quantity: 0,
        cost: 0,
        is_public: true,
      });
      fetchInventory(clubData.club_id);
    } catch (error: any) {
      console.error("Error saving inventory:", error);
      toast.error(error.message || "Failed to save inventory item");
    }
    setIsUpdatingInventory(false);
  };

  const handleDeleteInventory = async (inventoryId: string) => {
    setIsDeletingInventory(inventoryId)

    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("inventory_id", inventoryId);

      if (error) throw error;
      toast.success("Inventory item deleted");
      fetchInventory(clubData?.club_id || "");
    } catch (error: any) {
      console.error("Error deleting inventory:", error);
      toast.error(error.message || "Failed to delete inventory item");
    }
    setIsDeletingInventory("")
  };

  const handleRequestAction = async (
    transactionId: string,
    status: "approved" | "rejected" | "pending"
  ) => {
    setUpdatingStatus(transactionId);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status })
        .eq("transaction_id", transactionId);

      if (error) throw error;
      toast.success(`Request status updated to ${status}`);
      fetchRequests(clubData?.club_id || "");
      if (selectedTransaction?.transaction_id === transactionId) {
        setSelectedTransaction({ ...selectedTransaction, status });
      }
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast.error(error.message || "Failed to update request");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const openDetailDialog = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditingMessage(transaction.message || "");
    setDetailDialogOpen(true);
    setStudentInfo(null);
    
    // Fetch student info if student_id exists
    if (transaction.student_id) {
      fetchStudentInfo(transaction.student_id);
    }
    
    // Fetch club info if borrower_club_id exists (only when a club borrows from another club)
    // Don't auto-fetch, only fetch when user clicks "Load Details"
  };

  const fetchStudentInfo = async (usn: string) => {
    setLoadingStudentInfo(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          departments:dept_id (
            name
          )
        `)
        .eq("usn", usn)
        .single();

      if (error) throw error;

      setStudentInfo({
        usn: data.usn,
        name: data.name,
        email: data.email,
        semester: data.semester,
        dept_id: data.dept_id,
        department_name: data.departments?.name,
      });
    } catch (error: any) {
      console.error("Error fetching student info:", error);
      toast.error("Failed to fetch student information");
    } finally {
      setLoadingStudentInfo(false);
    }
  };

  const handleSaveMessage = async () => {
    if (!selectedTransaction) return;
    
    setIsSavingMessage(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ message: editingMessage })
        .eq("transaction_id", selectedTransaction.transaction_id);

      if (error) throw error;
      
      toast.success("Message updated successfully");
      setSelectedTransaction({ ...selectedTransaction, message: editingMessage });
      fetchRequests(clubData?.club_id || "");
    } catch (error: any) {
      console.error("Error updating message:", error);
      toast.error(error.message || "Failed to update message");
    } finally {
      setIsSavingMessage(false);
    }
  };

  const openInventoryDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingInventory(item);
      setInventoryForm({
        name: item.name,
        image: item.image || "",
        description: item.description || "",
        quantity: item.quantity,
        cost: item.cost || 0,
        is_public: item.is_public,
      });
    } else {
      setEditingInventory(null);
      setInventoryForm({
        name: "",
        description: "",
        image:"",
        quantity: 0,
        cost: 0,
        is_public: true,
      });
    }
    setInventoryDialogOpen(true);
  };

  if (userLoading || clubLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {clubData?.name || "Club Management"}
          </h1>
          <p className="text-muted-foreground">
            Manage your club members, inventory, and requests
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "members"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="inline-block mr-2 h-4 w-4" />
            Members
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "inventory"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="inline-block mr-2 h-4 w-4" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "requests"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck className="inline-block mr-2 h-4 w-4" />
            Requests
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === "members" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-5">
                <div>
                  <CardTitle>Club Members</CardTitle>
                  <CardDescription className="mt-2">
                    Manage your club members and their roles.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedMembers.size > 0 && (
                    <Button
                      variant="destructive"
                      onClick={handleBulkRemoveMembers}
                      disabled={isDeletingMembers}
                    >
                      {isDeletingMembers?<Loader2 className="h-4 w-4 animate-spin" />:<Trash2 className="h-4 w-4" />}
                      ( {selectedMembers.size} )
                    </Button>
                  )}
                  <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4" />
                        New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                        <DialogDescription>
                          Enter the student's USN to add them to the club.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="usn" className="p-2">USN : </Label>
                          <Input
                            id="usn"
                            value={newMemberUSN}
                            onChange={(e) => setNewMemberUSN(e.target.value)}
                            placeholder="Enter USN"
                            className="w-[90%] ml-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role" className="p-2">Role</Label>
                          <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                            <SelectTrigger className="w-[150px] ml-2">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="New Member">New Member</SelectItem>
                              <SelectItem value="Member">Member</SelectItem>
                              <SelectItem value="Core Member">Core Member</SelectItem>
                              <SelectItem value="Co-lead">Co Lead</SelectItem>
                              <SelectItem value="Team Lead">Team Lead</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setMemberDialogOpen(false)} disabled={isAddingMember}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddMember} disabled={isAddingMember}>{isAddingMember?<Loader2 className="h-4 w-4 animate-spin" />:"Add Member"}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Sort Controls */}
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by USN, name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sortBy} onValueChange={(value: "name" | "role") => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="role">Sort by Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          filteredAndSortedMembers.length > 0 &&
                          selectedMembers.size === filteredAndSortedMembers.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(
                              new Set(filteredAndSortedMembers.map((m) => m.member_id))
                            );
                          } else {
                            setSelectedMembers(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {searchQuery.trim() ? "No members found" : "No members yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedMembers.map((member) => (
                      <TableRow key={member.member_id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.member_id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedMembers);
                              if (e.target.checked) {
                                newSet.add(member.member_id);
                              } else {
                                newSet.delete(member.member_id);
                              }
                              setSelectedMembers(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell>{member.usn}</TableCell>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {updatingRole === member.member_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) =>
                                handleUpdateRole(member.member_id, newRole)
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new member">New Member</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="core member">Core Member</SelectItem>
                                <SelectItem value="co lead">Co Lead</SelectItem>
                                <SelectItem value="Team lead">Team Lead</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-5">
                <div>
                  <CardTitle>Inventory</CardTitle>
                  <CardDescription className="mt-2">
                    Manage your club's inventory items.
                  </CardDescription>
                </div>
                <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openInventoryDialog()}>
                      <Plus className="h-4 w-4" />
                      New Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingInventory ? "Edit Item" : "Add New Item"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="name" className="p-2">Name *</Label>
                        <Input
                          id="name"
                          value={inventoryForm.name}
                          onChange={(e) =>
                            setInventoryForm({ ...inventoryForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-[75%]">
                          <Label htmlFor="image" className="p-2">Image URL</Label>
                          <Input
                            id="image"
                            value={inventoryForm.image}
                            onChange={(e) =>
                              setInventoryForm({
                                ...inventoryForm,
                                image: e.target.value
                              })
                            }
                            placeholder="Enter image URL..."
                          />
                        </div>

                        <div className="w-[25%] flex items-end">
                          <img
                            src={
                              inventoryForm.image?.trim()
                                ? inventoryForm.image
                                : "/placeholder.png"
                            }
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.png"; // fallback if invalid
                            }}
                            alt="Inventory Image"
                            className="w-full h-20 object-cover rounded-md border-2 border-ring"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description" className="p-2">Description</Label>
                        <Textarea
                          id="description"
                          value={inventoryForm.description}
                          onChange={(e) =>
                            setInventoryForm({
                              ...inventoryForm,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity" className="p-2">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="0"
                            value={inventoryForm.quantity}
                            onChange={(e) =>
                              setInventoryForm({
                                ...inventoryForm,
                                quantity: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="cost" className="p-2">Cost</Label>
                          <Input
                            id="cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={inventoryForm.cost}
                            onChange={(e) =>
                              setInventoryForm({
                                ...inventoryForm,
                                cost: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                      <Switch
                        id="is_public"
                        defaultChecked={true}
                        checked={inventoryForm.is_public}
                        onCheckedChange={(value: boolean) =>
                          setInventoryForm({
                            ...inventoryForm,
                            is_public: value,
                          })
                        }
                      />

                        <Label htmlFor="is_public">{inventoryForm.is_public ? "Public" : "Private"}</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setInventoryDialogOpen(false)}
                        disabled={isUpdatingInventory}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveInventory} disabled={isUpdatingInventory}>{isUpdatingInventory?<Loader2 className="h-4 w-4 animate-spin" />:"Save"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No inventory items yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item) => (
                      <TableRow key={item.inventory_id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.cost || 0}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_public ? "success" : "secondary"}>
                            {item.is_public ? "Public" : "Private"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <img src={item.image || "/placeholder.png"} alt="Inventory Image" className="w-20 h-20 object-cover rounded-md border-2 border-ring" />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openInventoryDialog(item)}
                              className="bg-background/70 text-foreground hover:text-background"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-background/70 text-red-500 hover:bg-red-500 hover:text-white"
                                disabled={isDeletingInventory==item.inventory_id}
                              >
                                {isDeletingInventory==item.inventory_id?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="h-4 w-4" />}
                              </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. The Inventory Item shall be removed!
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInventory(item.inventory_id)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Requests</CardTitle>
              <CardDescription>
                Manage inventory borrowing requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No requests yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.transaction_id}>
                        <TableCell>{request.name}</TableCell>
                        <TableCell>{request.inventory_name}</TableCell>
                        <TableCell>{request.quantity}</TableCell>
                        <TableCell>
                          {new Date(request.date_of_issue).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.due_date
                            ? new Date(request.due_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[250px] w-full whitespace-normal break-words">
                            {request.message || "-"}
                          </p>
                        </TableCell>

                        <TableCell>
                        {updatingStatus === request.transaction_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : request.status === "underconsideration" ? (
                          <p className="text-sm font-medium text-muted-foreground">
                            Pending Dept Approval
                          </p>
                        ) : (
                          <Select
                            value={request.status}
                            onValueChange={(newStatus: "pending" | "approved" | "rejected") =>
                              handleRequestAction(request.transaction_id, newStatus)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        </TableCell>
                        
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetailDialog(request)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Request Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                View and manage transaction information
              </DialogDescription>
            </DialogHeader>
            
            {selectedTransaction && (
              <div className="space-y-6 py-4">
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Transaction ID</Label>
                    <p className="text-sm font-mono">{selectedTransaction.transaction_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                    {updatingStatus === selectedTransaction.transaction_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedTransaction.status === "underconsideration" ? (
                      // 🔒 Locked view (cannot modify)
                      <p className="text-sm font-medium text-muted-foreground">
                        Pending Dept Approval
                      </p>
                    ) : (
                      // ✅ Editable Select (for other statuses)
                      <Select
                        value={selectedTransaction.status}
                        onValueChange={(newStatus: "pending" | "approved" | "rejected") =>
                          handleRequestAction(selectedTransaction.transaction_id, newStatus)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Item</Label>
                    <p className="text-sm">{selectedTransaction.inventory_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                    <p className="text-sm">{selectedTransaction.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Request Date</Label>
                    <p className="text-sm">
                      {new Date(selectedTransaction.date_of_issue).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p className="text-sm">
                      {selectedTransaction.due_date
                        ? new Date(selectedTransaction.due_date).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
                <div>
                <Label className="text-sm font-medium">
                    Updated At : {selectedTransaction.updated_at
                        ? new Date(selectedTransaction.updated_at).toLocaleString()
                        : "-"}
                </Label>

                </div>

                {/* Message Section */}
                <div>
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveMessage}
                    disabled={isSavingMessage || editingMessage === selectedTransaction.message}
                    className="mt-2"
                  >
                    {isSavingMessage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Message"
                    )}
                  </Button>
                </div>

                {/* Student Info Section */}
                {selectedTransaction.student_id && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Student Information</Label>
                      {!studentInfo && !loadingStudentInfo && selectedTransaction.student_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedTransaction.student_id) {
                              fetchStudentInfo(selectedTransaction.student_id);
                            }
                          }}
                        >
                          Load Details
                        </Button>
                      )}
                    </div>
                    {loadingStudentInfo ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading student info...</span>
                      </div>
                    ) : studentInfo ? (
                      <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-md">
                        <div>
                          <Label className="text-xs text-muted-foreground">USN</Label>
                          <p className="text-sm font-medium">{studentInfo.usn}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <p className="text-sm font-medium">{studentInfo.name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p className="text-sm">{studentInfo.email}</p>
                        </div>
                        {studentInfo.semester && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Semester</Label>
                            <p className="text-sm">{studentInfo.semester}</p>
                          </div>
                        )}
                        {studentInfo.department_name && (
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Department</Label>
                            <p className="text-sm">{studentInfo.department_name}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click "Load Details" to view student information
                      </p>
                    )}
                  </div>
                )}

                {/* Club/Borrower Info Section */}
                {selectedTransaction.borrower_club_id && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Borrower (Club) Information</Label>
                    </div>
                      <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-md">
                        <div>
                          <Label className="text-xs text-muted-foreground">Club ID</Label>
                          <p className="text-sm font-mono">{selectedTransaction.borrower_club_id}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <p className="text-sm font-medium">{selectedTransaction.name}</p>
                        </div>
                      
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <p className="text-sm">{selectedTransaction.borrower_club_email}</p>
                          </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

