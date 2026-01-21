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
  IndianRupee,
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
} from "@/components/ui/alert-dialog";
import {
  TRANSACTION_STATUS,
  TransactionStatusCode,
  parseTransactionStatus,
  getStatusLabel,
  getStatusBadgeVariant,
  getClubStatusActions,
  canAdvanceStatus,
} from "@/lib/transactionStatus";
import {
  FUND_TYPE,
  FUND_TYPE_LABELS,
  EXPENDITURE_TYPES,
  INCOME_TYPES,
  getFundTypeLabel,
  isExpenditure,
  isIncome,
  FundTypeCode,
} from "@/lib/fundTypeStatus";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ArrowDownCircle, ArrowUpCircle, BarChart3 } from "lucide-react";
import FundStatistics from "@/components/FundStatistics";
type TabType = "members" | "inventory" | "requests" | "funds";
type FundsViewType = "table" | "statistics";

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
  status: TransactionStatusCode;
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

interface Fund {
  fund_id: string;
  amount: number;
  description: string | null;
  club_id: string;
  is_credit: boolean;
  type: number;
  bill_date: string | null;
  name: string | null;
  submitted_by: string | null;
  is_trashed: boolean;
  submitted_by_name?: string;
}


export default function ClubPage() {
  const { user, loading: userLoading } = useUserInfo();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [availableClubs, setAvailableClubs] = useState<{ club_id: string; name: string }[]>([]);
  const [clubData, setClubData] = useState<any>(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<Transaction[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
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
  // Requests filter/sort states
  const [requestSearchQuery, setRequestSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<
    TransactionStatusCode | "all"
  >("all");
  const [requestSortBy, setRequestSortBy] = useState<"date" | "status">("date");
  
  // Funds management states
  const [fundsDialogOpen, setFundsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [fundForm, setFundForm] = useState<{
    name: string;
    amount: number;
    description: string;
    is_credit: boolean;
    type: FundTypeCode;
    bill_date: string;
    submitted_by_usn: string;
  }>({
    name: "",
    amount: 0,
    description: "",
    is_credit: false,
    type: FUND_TYPE.ADMINISTRATIVE,
    bill_date: "",
    submitted_by_usn: "",
  });
  const [isSavingFund, setIsSavingFund] = useState(false);
  const [isDeletingFund, setIsDeletingFund] = useState<string | null>(null);
  const [fundSearchQuery, setFundSearchQuery] = useState("");
  const [fundTypeFilter, setFundTypeFilter] = useState<"all" | "expenditure" | "income">("all");
  const [fundCreditFilter, setFundCreditFilter] = useState<"all" | "credit" | "debit">("all");
  const [fundsView, setFundsView] = useState<FundsViewType>("table");

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }

    if (user.role !== "club" && user.role !== "admin") {
      toast.error("You don't have access to club management");
      router.push("/");
      return;
    }

    if (user.role === "admin") {
      fetchAdminClubs();
    } else {
      setSelectedClubId(user.user_id);
      fetchClubData(user.user_id);
    }
  }, [user, userLoading]);

  const fetchAdminClubs = async () => {
    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("club_id, name")
        .order("name");

      if (error) throw error;

      const options = data || [];
      setAvailableClubs(options);
      if (options.length > 0) {
        const idToUse = selectedClubId || options[0].club_id;
        setSelectedClubId(idToUse);
        await fetchClubData(idToUse);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
      toast.error("Failed to load clubs for admin");
    }
  };

  const fetchClubData = async (clubId: string) => {
    try {
      setClubLoading(true);

      // Fetch club data
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("*")
        .eq("club_id", clubId)
        .single();

      if (clubError) {
        toast.error("Failed to fetch club data");
        console.error(clubError);
        return;
      }

      setClubData(club);

      // Admins bypass email checks
      if (user?.role === "admin") {
        setIsAuthorized(true);
      } else {
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
      }

      // Fetch members
      await fetchMembers(club.club_id);
      // Fetch inventory
      await fetchInventory(club.club_id);
      // Fetch requests
      await fetchRequests(club.club_id);
      // Fetch funds
      await fetchFunds(club.club_id);
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
        role: (m.role || "new member"),
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
        status: parseTransactionStatus(t.status),
        name: t.students?.name || t.clubs?.name || "-",
        inventory_name: t.inventory?.name || "Unknown",
        borrower_club_email: t.clubs?.email || "Not found",
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    }
  };

  const fetchFunds = async (clubId: string) => {
    try {
      const { data, error } = await supabase
        .from("funds")
        .select(`
          *,
          memberships:submitted_by (
            usn,
            students:usn (
              name
            )
          )
        `)
        .eq("club_id", clubId)
        .eq("is_trashed", false)
        .order("bill_date", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const formattedFunds: Fund[] = (data || []).map((f: any) => ({
        ...f,
        submitted_by_name: f.memberships?.students?.name || "Unknown",
      }));

      setFunds(formattedFunds);
    } catch (error) {
      console.error("Error fetching funds:", error);
      toast.error("Failed to fetch funds");
    }
  };

  const handleAddMember = async () => {
    if (isAddingMember) return;
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
      setNewMemberRole("new member");
      setMemberDialogOpen(false);
      fetchMembers(clubData.club_id);
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Failed to add member");
    }
    setIsAddingMember(false);
  };

  const handleBulkRemoveMembers = async () => {
    if (isDeletingMembers) return;
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
    if (updatingRole) return;
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

  // Filter and sort requests
  const filteredAndSortedRequests = requests
    .filter((request) => {
      // Status filter
      if (requestStatusFilter !== "all" && request.status !== requestStatusFilter) {
        return false;
      }

      // Search by borrower name or item name
      if (!requestSearchQuery.trim()) return true;
      const query = requestSearchQuery.toLowerCase().trim();
      const borrowerName = (request.name || "").toLowerCase();
      const itemName = (request.inventory_name || "").toLowerCase();

      return borrowerName.includes(query) || itemName.includes(query);
    })
    .sort((a, b) => {
      if (requestSortBy === "status") {
        if (a.status !== b.status) {
          return a.status - b.status;
        }
        // If same status, keep most recent first
        return (
          new Date(b.date_of_issue).getTime() - new Date(a.date_of_issue).getTime()
        );
      }

      // Default: sort by most recent request date
      return (
        new Date(b.date_of_issue).getTime() - new Date(a.date_of_issue).getTime()
      );
    });

  const handleSaveInventory = async () => {
    if (isUpdatingInventory) return;
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
    if (isDeletingInventory) return;
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
    nextStatus: TransactionStatusCode
  ) => {
    if (updatingStatus) return;
    setUpdatingStatus(transactionId);
    try {
      const current =
        requests.find((req) => req.transaction_id === transactionId)?.status ??
        (selectedTransaction?.transaction_id === transactionId
          ? selectedTransaction.status
          : undefined);

      if (current === undefined) {
        toast.error("Unable to find transaction details");
        return;
      }

      if (!canAdvanceStatus(current, nextStatus)) {
        toast.error("Status can only move forward");
        return;
      }

      const allowedStatuses = getClubStatusActions(current);
      if (!allowedStatuses.includes(nextStatus)) {
        toast.error("Invalid status transition for club");
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .update({ status: nextStatus })
        .eq("transaction_id", transactionId);

      if (error) throw error;
      toast.success(`Request status updated to ${getStatusLabel(nextStatus)}`);
      await fetchRequests(clubData?.club_id || "");
      if (selectedTransaction?.transaction_id === transactionId) {
        setSelectedTransaction({ ...selectedTransaction, status: nextStatus });
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
    if (isSavingMessage) return;
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

  const openFundDialog = async (fund?: Fund) => {
    if (fund) {
      setEditingFund(fund);
      // Get the USN from the submitted_by member_id
      let submittedUsn = "";
      if (fund.submitted_by) {
        try {
          const { data, error } = await supabase
            .from("memberships")
            .select("usn")
            .eq("member_id", fund.submitted_by)
            .single();
          
          if (!error && data) {
            submittedUsn = data.usn || "";
          }
        } catch (error) {
          console.error("Error fetching USN:", error);
        }
      }
      setFundForm({
        name: fund.name || "",
        amount: fund.amount || 0,
        description: fund.description || "",
        is_credit: fund.is_credit,
        type: fund.type as FundTypeCode,
        bill_date: fund.bill_date || "",
        submitted_by_usn: submittedUsn,
      });
    } else {
      setEditingFund(null);
      setFundForm({
        name: "",
        amount: 0,
        description: "",
        is_credit: false,
        type: FUND_TYPE.ADMINISTRATIVE,
        bill_date: "",
        submitted_by_usn: "",
      });
    }
    setFundsDialogOpen(true);
  };

  const handleSaveFund = async () => {
    if (isSavingFund) return;
    if (!fundForm.name.trim() || !clubData || fundForm.amount <= 0) {
      toast.error("Please fill in all required fields and ensure amount is greater than 0");
      return;
    }

    if (!fundForm.submitted_by_usn.trim()) {
      toast.error("Please enter the student USN");
      return;
    }

    setIsSavingFund(true);
    try {
      // Get member_id from USN and club_id
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .select("member_id")
        .eq("club_id", clubData.club_id)
        .eq("usn", fundForm.submitted_by_usn.trim().toUpperCase())
        .single();

      if (membershipError || !membership) {
        toast.error("Student USN not found in club members. Please check the USN.");
        setIsSavingFund(false);
        return;
      }

      if (editingFund) {
        // Update existing
        const { error } = await supabase
          .from("funds")
          .update({
            name: fundForm.name,
            amount: fundForm.amount,
            description: fundForm.description || null,
            is_credit: fundForm.is_credit,
            type: fundForm.type,
            bill_date: fundForm.bill_date || null,
            submitted_by: membership.member_id,
          })
          .eq("fund_id", editingFund.fund_id);

        if (error) throw error;
        toast.success("Fund updated successfully");
      } else {
        // Create new
        const { error } = await supabase.from("funds").insert({
          club_id: clubData.club_id,
          name: fundForm.name,
          amount: fundForm.amount,
          description: fundForm.description || null,
          is_credit: fundForm.is_credit,
          type: fundForm.type,
          bill_date: fundForm.bill_date || null,
          submitted_by: membership.member_id,
          is_trashed: false,
        });

        if (error) throw error;
        toast.success("Fund added successfully");
      }

      setFundsDialogOpen(false);
      setEditingFund(null);
      setFundForm({
        name: "",
        amount: 0,
        description: "",
        is_credit: false,
        type: FUND_TYPE.ADMINISTRATIVE,
        bill_date: "",
        submitted_by_usn: "",
      });
      fetchFunds(clubData.club_id);
    } catch (error: any) {
      console.error("Error saving fund:", error);
      toast.error(error.message || "Failed to save fund");
    }
    setIsSavingFund(false);
  };

  const handleDeleteFund = async (fundId: string) => {
    if (isDeletingFund) return;
    setIsDeletingFund(fundId);
    try {
      const { error } = await supabase
        .from("funds")
        .update({ is_trashed: true })
        .eq("fund_id", fundId);

      if (error) throw error;
      toast.success("Fund deleted successfully");
      fetchFunds(clubData?.club_id || "");
    } catch (error: any) {
      console.error("Error deleting fund:", error);
      toast.error(error.message || "Failed to delete fund");
    }
    setIsDeletingFund(null);
  };

  // Filter and sort funds
  const filteredAndSortedFunds = funds
    .filter((fund) => {
      // Type filter
      if (fundTypeFilter === "expenditure" && !isExpenditure(fund.type)) {
        return false;
      }
      if (fundTypeFilter === "income" && !isIncome(fund.type)) {
        return false;
      }

      // Credit/Debit filter
      if (fundCreditFilter === "credit" && !fund.is_credit) {
        return false;
      }
      if (fundCreditFilter === "debit" && fund.is_credit) {
        return false;
      }

      // Search filter
      if (!fundSearchQuery.trim()) return true;
      const query = fundSearchQuery.toLowerCase().trim();
      const submittedLabel=(fund.submitted_by_name || "").toLowerCase();
      const name = (fund.name || "").toLowerCase();
      const description = (fund.description || "").toLowerCase();
      const typeLabel = getFundTypeLabel(fund.type).toLowerCase();

      return name.includes(query) || description.includes(query) || typeLabel.includes(query) || submittedLabel.includes(query)
    })
    .sort((a, b) => {
      // Sort by bill_date (most recent first), then by amount
      if (a.bill_date && b.bill_date) {
        return new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime();
      }
      if (a.bill_date) return -1;
      if (b.bill_date) return 1;
      return b.amount - a.amount;
    });

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
          {user?.role === "admin" && availableClubs.length > 0 && (
            <div className="mt-3 flex gap-3 items-center">
              <p className="text-sm text-muted-foreground">Viewing club:</p>
              <Select
                value={selectedClubId}
                onValueChange={(value) => {
                  setSelectedClubId(value);
                  fetchClubData(value);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {availableClubs.map((c) => (
                    <SelectItem key={c.club_id} value={c.club_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b flex-wrap">
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
          <button
            onClick={() => setActiveTab("funds")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "funds"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <IndianRupee className="inline-block mr-2 h-4 w-4" />
            Funds
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
                            className="w-[90%] ml-2 uppercase"
                          />

                        </div>
                        <div>
                          <Label htmlFor="role" className="p-2">Role</Label>
                          <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                            <SelectTrigger className="w-[150px] ml-2">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new member">New Member</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="core member">Core Member</SelectItem>
                              <SelectItem value="co lead">Co Lead</SelectItem>
                              <SelectItem value="team lead">Team Lead</SelectItem>
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
                                <SelectItem value="team lead">Team Lead</SelectItem>
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
              {/* Request filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by borrower or item name..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={requestStatusFilter === "all" ? "all" : String(requestStatusFilter)}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setRequestStatusFilter("all");
                        return;
                      }
                      const parsed = Number(value);
                      if (!Number.isNaN(parsed)) {
                        setRequestStatusFilter(parsed as TransactionStatusCode);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.PROCESSING)}>
                        {getStatusLabel(TRANSACTION_STATUS.PROCESSING)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.DEPARTMENT_PENDING)}>
                        {getStatusLabel(TRANSACTION_STATUS.DEPARTMENT_PENDING)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.DEPARTMENT_APPROVED)}>
                        {getStatusLabel(TRANSACTION_STATUS.DEPARTMENT_APPROVED)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.DEPARTMENT_REJECTED)}>
                        {getStatusLabel(TRANSACTION_STATUS.DEPARTMENT_REJECTED)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.CLUB_APPROVED)}>
                        {getStatusLabel(TRANSACTION_STATUS.CLUB_APPROVED)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.CLUB_REJECTED)}>
                        {getStatusLabel(TRANSACTION_STATUS.CLUB_REJECTED)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.COLLECTED)}>
                        {getStatusLabel(TRANSACTION_STATUS.COLLECTED)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.OVERDUE)}>
                        {getStatusLabel(TRANSACTION_STATUS.OVERDUE)}
                      </SelectItem>
                      <SelectItem value={String(TRANSACTION_STATUS.RETURNED)}>
                        {getStatusLabel(TRANSACTION_STATUS.RETURNED)}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={requestSortBy}
                    onValueChange={(value: "date" | "status") => setRequestSortBy(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Sort by Latest</SelectItem>
                      <SelectItem value="status">Sort by Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                  {filteredAndSortedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {requests.length === 0
                          ? "No requests yet"
                          : "No requests match the current filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedRequests.map((request) => (
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
                          <div className="flex flex-col gap-2">
                            <Badge variant={getStatusBadgeVariant(request.status)} className="w-[180px]">
                              {getStatusLabel(request.status)}
                            </Badge>
                            {updatingStatus === request.transaction_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              (() => {
                                const options = getClubStatusActions(request.status);
                                if (options.length === 0) {
                                  return null;
                                }
                                return (
                                  <Select
                                    onValueChange={(value) => {
                                      const parsed = Number(value);
                                      if (Number.isNaN(parsed)) return;
                                      handleRequestAction(
                                        request.transaction_id,
                                        parsed as TransactionStatusCode
                                      );
                                    }}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue placeholder="Update status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {options.map((code) => (
                                        <SelectItem key={code} value={String(code)}>
                                          {getStatusLabel(code)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              })()
                            )}
                          </div>
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

        {/* Funds Tab */}
        {activeTab === "funds" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-5">
                <div>
                  <CardTitle>Funds Management</CardTitle>
                  <CardDescription className="mt-2">
                    Manage your club's income and expenditure records.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex gap-1 border rounded-md p-1">
                    <Button
                      variant={fundsView === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFundsView("table")}
                    >
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Table
                    </Button>
                    <Button
                      variant={fundsView === "statistics" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setFundsView("statistics")}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Statistics
                    </Button>
                  </div>
                  {fundsView === "table" && (
                    <Dialog open={fundsDialogOpen} onOpenChange={setFundsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openFundDialog()}>
                      <Plus className="h-4 w-4" />
                      New Fund
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingFund ? "Edit Fund" : "Add New Fund"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="fund-name" className="p-2">Name *</Label>
                        <Input
                          id="fund-name"
                          value={fundForm.name}
                          onChange={(e) =>
                            setFundForm({ ...fundForm, name: e.target.value })
                          }
                          placeholder="Enter fund name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fund-amount" className="p-2">Amount *</Label>
                          <Input
                            id="fund-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={fundForm.amount}
                            onChange={(e) =>
                              setFundForm({
                                ...fundForm,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fund-bill-date" className="p-2">Bill Date</Label>
                          <Input
                            id="fund-bill-date"
                            className="text-foreground"
                            type="date"
                            value={fundForm.bill_date}
                            onChange={(e) =>
                              setFundForm({ ...fundForm, bill_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="fund-type" className="p-2">Type *</Label>
                        <Select
                          value={String(fundForm.type)}
                          onValueChange={(value) => {
                            const parsed = parseInt(value);
                            const credit = isIncome(parsed);

                            setFundForm((prev) => ({
                              ...prev,
                              type: parsed as FundTypeCode,
                              is_credit: credit,
                            }));
                          }}
                        >

                          <SelectTrigger>
                            <SelectValue placeholder="Select fund type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENDITURE_TYPES.map((type) => (
                              <SelectItem key={type} value={String(type)}>
                                {getFundTypeLabel(type)} (Expenditure)
                              </SelectItem>
                            ))}
                            {INCOME_TYPES.map((type) => (
                              <SelectItem key={type} value={String(type)}>
                                {getFundTypeLabel(type)} (Income)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fund-description" className="p-2">Description</Label>
                        <Textarea
                          id="fund-description"
                          value={fundForm.description}
                          onChange={(e) =>
                            setFundForm({ ...fundForm, description: e.target.value })
                          }
                          placeholder="Enter description (optional)"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fund-submitted-by-usn" className="p-2">Submitted By (USN) *</Label>
                        <Input
                          id="fund-submitted-by-usn"
                          value={fundForm.submitted_by_usn}
                          onChange={(e) =>
                            setFundForm({ ...fundForm, submitted_by_usn: e.target.value.toUpperCase() })
                          }
                          placeholder="Enter student USN"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="fund-is-credit"
                          checked={fundForm.is_credit}
                        />
                        <Label htmlFor="fund-is-credit">
                          {fundForm.is_credit ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <ArrowUpCircle className="h-4 w-4" />
                              Credit (Income)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-white">
                              <ArrowDownCircle className="h-4 w-4" />
                              Debit (Expenditure)
                            </span>
                          )}
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setFundsDialogOpen(false)}
                        disabled={isSavingFund}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveFund} disabled={isSavingFund}>
                        {isSavingFund ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fundsView === "statistics" ? (
                <FundStatistics funds={funds} />
              ) : (
                <>
              {/* Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, description,submitted by or type..."
                    value={fundSearchQuery}
                    onChange={(e) => setFundSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={fundTypeFilter}
                    onValueChange={(value: "all" | "expenditure" | "income") =>
                      setFundTypeFilter(value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="expenditure">Expenditure</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Income</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        funds
                          .filter((f) => f.is_credit)
                          .reduce((sum, f) => sum + (f.amount || 0), 0)
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Expenditure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        funds
                          .filter((f) => !f.is_credit)
                          .reduce((sum, f) => sum + (f.amount || 0), 0)
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Net Balance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${
                        funds.reduce(
                          (sum, f) => sum + (f.is_credit ? f.amount : -f.amount || 0),
                          0
                        ) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(
                        funds.reduce(
                          (sum, f) => sum + (f.is_credit ? f.amount : -f.amount || 0),
                          0
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedFunds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {funds.length === 0
                          ? "No funds yet"
                          : "No funds match the current filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedFunds.map((fund) => (
                      <TableRow key={fund.fund_id}>
                        <TableCell className="font-medium">{fund.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getFundTypeLabel(fund.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(fund.amount || 0)}
                        </TableCell>
                        <TableCell>
                          {fund.is_credit ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Credit
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-red-600 text-white">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Debit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {fund.bill_date
                            ? new Date(fund.bill_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate">
                            {fund.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fund.submitted_by_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openFundDialog(fund)}
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
                                  disabled={isDeletingFund === fund.fund_id}
                                >
                                  {isDeletingFund === fund.fund_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action will soft delete the fund (mark as trashed). It can be restored later if needed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteFund(fund.fund_id)}
                                  >
                                    Continue
                                  </AlertDialogAction>
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
                </>
              )}
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
                    <div className="mt-1 flex flex-col gap-2">
                      <Badge variant={getStatusBadgeVariant(selectedTransaction.status)} className="w-[180px]">
                        {getStatusLabel(selectedTransaction.status)}
                      </Badge>
                      {updatingStatus === selectedTransaction.transaction_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        (() => {
                          const options = getClubStatusActions(selectedTransaction.status);
                          if (options.length === 0) {
                            return null;
                          }
                          return (
                            <Select
                              onValueChange={(value) => {
                                const parsed = Number(value);
                                if (Number.isNaN(parsed)) return;
                                handleRequestAction(
                                  selectedTransaction.transaction_id,
                                  parsed as TransactionStatusCode
                                );
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Update status" />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((code) => (
                                  <SelectItem key={code} value={String(code)}>
                                    {getStatusLabel(code)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()
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

