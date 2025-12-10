"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useUserInfo } from "@/hooks/useUserInfo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, ClipboardList, Award, Search } from "lucide-react";
import {
  TRANSACTION_STATUS,
  TransactionStatusCode,
  getStatusBadgeVariant,
  getStatusLabel,
  parseTransactionStatus,
} from "@/lib/transactionStatus";

interface StudentProfile {
  usn: string;
  name: string;
  email: string;
  semester?: number;
  department_name?: string;
}

interface Membership {
  club_id: string;
  club_name: string;
  club_description?: string;
  role: string;
}

interface TransactionEntry {
  transaction_id: string;
  inventory_name: string;
  club_name: string;
  quantity: number;
  date_of_issue: string;
  due_date: string | null;
  message: string | null;
  status: TransactionStatusCode;
}

type SortOption = "recent" | "oldest" | "statusAsc" | "statusDesc";

export default function StudentDashboardPage() {
  const { user, loading: userLoading } = useUserInfo();
  const router = useRouter();

  const [adminUsn, setAdminUsn] = useState("");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [requestSearch, setRequestSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }

    if (user.role !== "student" && user.role !== "admin") {
      toast.error("Only students can access the user dashboard");
      router.push("/");
      return;
    }

    if (user.role === "admin") {
      if (!adminUsn) {
        setPageLoading(false);
        return;
      }
      fetchDashboardData(adminUsn);
      return;
    }

    if (!user.user_id || user.user_id === "notset") {
      toast.error("Please complete your profile setup");
      router.push("/");
      return;
    }

    fetchDashboardData(user.user_id);
  }, [user, userLoading, adminUsn]);

  const fetchDashboardData = async (usn: string) => {
    try {
      setPageLoading(true);

      const [studentRes, membershipRes, transactionRes] = await Promise.all([
        supabase
          .from("students")
          .select(
            `
            usn,
            name,
            email,
            semester,
            departments:dept_id (
              name
            )
          `
          )
          .eq("usn", usn)
          .single(),
        supabase
          .from("memberships")
          .select(
            `
            club_id,
            role,
            clubs:club_id (
              name,
              description
            )
          `
          )
          .eq("usn", usn),
        supabase
          .from("transactions")
          .select(
            `
            *,
            inventory:inventory_id (
              name,
              clubs:club_id (
                name
              )
            )
          `
          )
          .eq("student_id", usn)
          .order("date_of_issue", { ascending: false }),
      ]);

      if (studentRes.error) throw studentRes.error;
      if (membershipRes.error) throw membershipRes.error;
      if (transactionRes.error) throw transactionRes.error;

      const studentData = studentRes.data;
      const departmentInfo = Array.isArray(studentData.departments)
        ? studentData.departments[0]
        : studentData.departments;
      setProfile({
        usn: studentData.usn,
        name: studentData.name,
        email: studentData.email,
        semester: studentData.semester,
        department_name: departmentInfo?.name,
      });

      const membershipData =
        membershipRes.data?.map((membership) => {
          const clubInfo = Array.isArray(membership.clubs)
            ? membership.clubs[0]
            : membership.clubs;
          return {
            club_id: membership.club_id,
            club_name: clubInfo?.name || "Unknown Club",
            club_description: clubInfo?.description || "",
            role: membership.role || "Member",
          };
        }) || [];
      setMemberships(membershipData);

      const transactionData =
        transactionRes.data?.map((transaction) => {
          const clubInfo = Array.isArray(transaction.inventory?.clubs)
            ? transaction.inventory?.clubs[0]
            : transaction.inventory?.clubs;

          return {
            transaction_id: transaction.transaction_id,
            inventory_name: transaction.inventory?.name || "Unknown Item",
            club_name: clubInfo?.name || "Unknown Club",
            quantity: transaction.quantity,
            date_of_issue: transaction.date_of_issue,
            due_date: transaction.due_date,
            message: transaction.message,
            status: parseTransactionStatus(transaction.status),
          };
        }) || [];
      setTransactions(transactionData);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error(error.message || "Failed to load dashboard");
    } finally {
      setPageLoading(false);
    }
  };

  const stats = useMemo(() => {
    const clubCount = memberships.length;
    const activeRequests = transactions.filter(
      (tx) =>
        tx.status === TRANSACTION_STATUS.PROCESSING ||
        tx.status === TRANSACTION_STATUS.DEPARTMENT_PENDING ||
        tx.status === TRANSACTION_STATUS.DEPARTMENT_APPROVED||
        tx.status === TRANSACTION_STATUS.CLUB_APPROVED ||
        tx.status === TRANSACTION_STATUS.COLLECTED ||
        tx.status === TRANSACTION_STATUS.OVERDUE
    ).length;
    const totalBorrowed = transactions.reduce(
      (sum, tx) => sum + (tx.status === TRANSACTION_STATUS.COLLECTED ? tx.quantity : 0),
      0
    );
    return {
      clubCount,
      activeRequests,
      totalBorrowed,
    };
  }, [memberships, transactions]);

  const visibleTransactions = useMemo(() => {
    const normalizedSearch = requestSearch.trim().toLowerCase();

    const filtered = transactions.filter((tx) => {
      if (!normalizedSearch) return true;
      const haystack = [
        tx.inventory_name,
        tx.club_name,
        tx.message ?? "",
        getStatusLabel(tx.status),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    const statusValue = (status: TransactionStatusCode) =>
      typeof status === "number" ? status : TRANSACTION_STATUS.PROCESSING;

    return filtered.sort((a, b) => {
      if (sortOption === "recent" || sortOption === "oldest") {
        const aDate = new Date(a.date_of_issue).getTime();
        const bDate = new Date(b.date_of_issue).getTime();
        return sortOption === "recent" ? bDate - aDate : aDate - bDate;
      }

      const difference = statusValue(a.status) - statusValue(b.status);
      return sortOption === "statusAsc" ? difference : -difference;
    });
  }, [transactions, requestSearch, sortOption]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role === "admin" && !adminUsn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="max-w-md w-full space-y-3">
          <h1 className="text-2xl font-semibold text-center">Admin Student Lookup</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter a student USN to view their dashboard.
          </p>
          <Input
            placeholder="Student USN"
            value={adminUsn}
            onChange={(e) => setAdminUsn(e.target.value)}
          />
          <Button onClick={() => adminUsn && setPageLoading(true)}>Load Dashboard</Button>
        </div>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          Unable to load your dashboard. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-primary/70 font-semibold">
            Student Hub
          </p>
          <h1 className="text-3xl font-bold">Welcome back, {profile.name}</h1>
          <p className="text-muted-foreground max-w-2xl">
            Review your membership summary, track borrowing requests, and keep
            your profile up-to-date in a single dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Clubs Joined
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.clubCount}</div>
              <p className="text-xs text-muted-foreground">
                Active memberships
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Requests
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeRequests}</div>
              <p className="text-xs text-muted-foreground">
                Pending approval or processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Items Borrowed
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBorrowed}</div>
              <p className="text-xs text-muted-foreground">
                Total quantity requested
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-full">
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
              <CardDescription>Your academic and contact info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-base font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">USN</p>
                <p className="text-base font-mono">{profile.usn}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-base break-all">{profile.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Semester</p>
                  <p className="text-base font-medium">
                    {profile.semester ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-base font-medium">
                    {profile.department_name ?? "Not linked"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 h-full">
            <CardHeader>
              <CardTitle>Club Memberships</CardTitle>
              <CardDescription>
                Clubs you&apos;re associated with and your role in each
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberships.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  You haven&apos;t joined any clubs yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {memberships.map((membership) => (
                    <div
                      key={membership.club_id}
                      className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <p className="text-base font-semibold">
                          {membership.club_name}
                        </p>
                        {membership.club_description && (
                          <p className="text-sm text-muted-foreground">
                            {membership.club_description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="w-fit capitalize text-center py-2">
                        {membership.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Track all borrowing requests, sort by status, or jump to a specific date.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={requestSearch}
                  onChange={(event) => setRequestSearch(event.target.value)}
                  placeholder="Search requests by item, club, message, or status"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="w-full sm:w-48">
                  <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort requests" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="statusAsc">Status A → Z</SelectItem>
                      <SelectItem value="statusDesc">Status Z → A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {visibleTransactions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {transactions.length === 0
                  ? "No transactions recorded yet."
                  : "No requests match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTransactions.map((transaction) => (
                      <TableRow key={transaction.transaction_id}>
                        <TableCell className="font-medium">
                          {transaction.inventory_name}
                        </TableCell>
                        <TableCell>{transaction.club_name}</TableCell>
                        <TableCell>{transaction.quantity}</TableCell>
                        <TableCell>
                          {new Date(
                            transaction.date_of_issue
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {transaction.due_date
                            ? new Date(transaction.due_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(transaction.status)}
                            className="min-w-[160px] justify-center"
                          >
                            {getStatusLabel(transaction.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-pre-wrap">
                          {transaction.message || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

