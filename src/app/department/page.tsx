"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserInfo } from "@/hooks/useUserInfo";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, FileCheck } from "lucide-react";
import {
  TRANSACTION_STATUS,
  TransactionStatusCode,
  getStatusBadgeVariant,
  getStatusLabel,
  getDepartmentStatusActions,
  canAdvanceStatus,
  parseTransactionStatus,
} from "@/lib/transactionStatus";

interface DepartmentRequest {
  request_id: string;
  dept_id: string;
  usn: string;
  transaction_id: string;
  created_at: string;
  student_name?: string;
  student_email?: string;
  inventory_name?: string;
  inventory_description?: string;
  quantity?: number;
  date_of_issue?: string;
  due_date?: string;
  status: TransactionStatusCode;
  message?: string;
  club_name?: string;
}

export default function DepartmentPage() {
  const { user, loading: userLoading } = useUserInfo();
  const router = useRouter();
  const [departmentData, setDepartmentData] = useState<any>(null);
  const [requests, setRequests] = useState<DepartmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }

    if (user.role !== "faculty" || !user.user_id || user.user_id === "notset") {
      toast.error("Only faculty members can access department pages");
      router.push("/");
      return;
    }

    fetchDepartmentData();
  }, [user, userLoading]);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);

      // Fetch faculty data to get department
      const { data: faculty, error: facultyError } = await supabase
        .from("faculty")
        .select("faculty_id, dept_id, name, email")
        .eq("faculty_id", user?.user_id)
        .single();

      if (facultyError || !faculty) {
        toast.error("Faculty record not found");
        router.push("/");
        return;
      }

      if (!faculty.dept_id) {
        toast.error("You are not assigned to a department");
        router.push("/");
        return;
      }

      // Fetch department data
      const { data: department, error: deptError } = await supabase
        .from("departments")
        .select("*")
        .eq("dept_id", faculty.dept_id)
        .single();

      if (deptError || !department) {
        toast.error("Department not found");
        router.push("/");
        return;
      }

      setDepartmentData(department);
      setIsAuthorized(true);

      // Fetch department requests
      await fetchRequests(faculty.dept_id);
    } catch (error) {
      console.error("Error fetching department data:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (deptId: string) => {
    try {
      const { data, error } = await supabase
        .from("department_requests")
        .select(`
          *,
          transactions:transaction_id (
            *,
            students:student_id (
              name,
              email
            ),
            inventory:inventory_id (
              name,
              description,
              club_id,
              clubs:club_id (
                name
              )
            ),
            clubs:borrower_club_id (
              name
            )
          )
        `)
        .eq("dept_id", deptId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedRequests: DepartmentRequest[] = (data || []).map((req: any) => {
        const transaction = req.transactions;
        // Get club name from inventory's club (for student requests) or borrower_club_id (for club requests)
        const clubName = transaction?.inventory?.clubs?.name || transaction?.clubs?.name || "Unknown Club";
        const status = parseTransactionStatus(transaction?.status);
        return {
          request_id: req.request_id,
          dept_id: req.dept_id,
          usn: req.usn,
          transaction_id: req.transaction_id,
          created_at: req.created_at,
          student_name: transaction?.students?.name || "Unknown",
          student_email: transaction?.students?.email || "",
          inventory_name: transaction?.inventory?.name || "Unknown",
          inventory_description: transaction?.inventory?.description || "",
          quantity: transaction?.quantity || 0,
          date_of_issue: transaction?.date_of_issue,
          due_date: transaction?.due_date,
          status,
          message: transaction?.message || "",
          club_name: clubName,
        };
      });

      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    }
  };

  const handleRequestAction = async (
    transactionId: string,
    nextStatus: TransactionStatusCode
  ) => {
    try {
      const request = requests.find((r) => r.transaction_id === transactionId);

      if (!request) {
        toast.error("Request not found");
        return;
      }

      if (!canAdvanceStatus(request.status, nextStatus)) {
        toast.error("Status can only move forward");
        return;
      }

      const allowedStatuses = getDepartmentStatusActions(request.status);
      if (!allowedStatuses.includes(nextStatus)) {
        toast.error("Invalid status transition for department");
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .update({ status: nextStatus })
        .eq("transaction_id", transactionId);

      if (error) throw error;

      toast.success(`Request ${nextStatus === TRANSACTION_STATUS.DEPARTMENT_APPROVED ? "approved" : "rejected"} successfully`);
      if (departmentData) {
        await fetchRequests(departmentData.dept_id);
      }
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast.error(error.message || "Failed to update request");
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const pendingRequests = requests.filter((r) => r.status === TRANSACTION_STATUS.DEPARTMENT_PENDING);
  
  const otherRequests = requests.filter((r) => r.status !== TRANSACTION_STATUS.DEPARTMENT_PENDING);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {departmentData?.name || "Department"} Requests
          </h1>
          <p className="text-muted-foreground">
            Review and manage inventory requests from students
          </p>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Pending Requests ({pendingRequests.length})
              </CardTitle>
              <CardDescription>
                Requests awaiting your approval or rejection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.student_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.usn}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {request.student_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{request.inventory_name}</div>
                      </TableCell>
                      <TableCell>{request.club_name}</TableCell>
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell>
                        {request.date_of_issue
                          ? new Date(request.date_of_issue).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {request.due_date
                          ? new Date(request.due_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {request.message ? (
                          <span className="text-sm">{request.message}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleRequestAction(
                                request.transaction_id,
                                TRANSACTION_STATUS.DEPARTMENT_APPROVED
                              )
                            }
                            className=" bg-background text-green-500 hover:bg-foreground"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleRequestAction(
                                request.transaction_id,
                                TRANSACTION_STATUS.DEPARTMENT_REJECTED
                              )
                            }
                            className="bg-background hover:bg-foreground text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Other Requests */}
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
            <CardDescription>
              Complete history of department requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {otherRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No requests found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherRequests.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.student_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.usn}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.inventory_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{request.club_name}</TableCell>
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell>
                        {request.date_of_issue
                          ? new Date(request.date_of_issue).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {request.due_date
                          ? new Date(request.due_date).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

