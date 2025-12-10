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
import { Badge } from "@/components/ui/badge";
import { Package, Search, Loader2 } from "lucide-react";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { TRANSACTION_STATUS } from "@/lib/transactionStatus";


interface InventoryItem {
  inventory_id: string;
  club_id: string;
  name: string;
  description: string;
  quantity: number;
  cost: number;
  image: string | null;
  is_public: boolean;
  club_name?: string;
  is_member?: boolean;
}

interface UserMemberships {
  club_id: string;
}

export default function InventoryPage() {
  const { user, loading: userLoading } = useUserInfo();
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [requestForm, setRequestForm] = useState({
    quantity: 1,
    due_date: "",
    message: "",
  });
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }

    if (user.role !== "admin" && (!user.user_id || user.user_id === "notset")) {
      toast.error("Please setup account properly");
      router.push("/");
      return;
    }

    fetchInventory();
    fetchUserMemberships();
  }, [user, userLoading]);

  const fetchUserMemberships = async () => {
    if (user?.role === "admin") {
      setUserMemberships(new Set());
      return;
    }
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("club_id")
        .eq("usn", user?.user_id);

      if (error) throw error;

      const clubIds = new Set((data || []).map((m: UserMemberships) => m.club_id));
      setUserMemberships(clubIds);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);

      if (user?.role === "admin") {
        const { data, error } = await supabase
          .from("inventory")
          .select(`
            *,
            clubs:club_id (
              name
            )
          `);

        if (error) throw error;

        const formattedInventory: InventoryItem[] = (data || []).map((item: any) => ({
          ...item,
          club_name: item.clubs?.name || "Unknown Club",
          is_member: true,
        }));

        setInventory(formattedInventory);
        return;
      }

      // Fetch public inventory
      const { data: publicInventory, error: publicError } = await supabase
        .from("inventory")
        .select(`
          *,
          clubs:club_id (
            name
          )
        `)
        .eq("is_public", true);

      if (publicError) throw publicError;
      // Fetch inventory from clubs user is a member of
      const { data: memberships } = await supabase
        .from("memberships")
        .select("club_id")
        .eq("usn", user?.user_id);

      const memberClubIds = (memberships || []).map((m: UserMemberships) => m.club_id);

      let memberInventory: any[] = [];
      if (memberClubIds.length > 0) {
        const { data, error } = await supabase
          .from("inventory")
          .select(`
            *,
            clubs:club_id (
              name
            )
          `)
          .in("club_id", memberClubIds);

        if (!error && data) {
          memberInventory = data;
        }
      }

      // Combine and deduplicate
      const allInventory = [...(publicInventory || []), ...memberInventory];
      const uniqueInventory = Array.from(
        new Map(allInventory.map((item) => [item.inventory_id, item])).values()
      );

      // Format inventory with club names and membership status
      const formattedInventory: InventoryItem[] = uniqueInventory.map((item: any) => ({
        ...item,
        club_name: item.clubs?.name || "Unknown Club",
        is_member: memberClubIds.includes(item.club_id),
      }));

      setInventory(formattedInventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = (item: InventoryItem) => {
    if (user?.role === "admin") {
      toast.error("Admins cannot place borrow requests");
      return;
    }
    setSelectedItem(item);
    setRequestForm({
      quantity: 1,
      due_date: "",
      message: "",
    });
    setRequestDialogOpen(true);
  };

  const submitRequest = async () => {
    if (isSubmitting) return;
    if (!selectedItem || !user || !requestForm.quantity || requestForm.quantity <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (requestForm.quantity > selectedItem.quantity) {
      toast.error("Requested quantity exceeds available quantity");
      return;
    }

    try {
      setIsSubmitting(true);
      // Case 1: User is a club - direct borrow
      if (user.role === "club") {
        const { error } = await supabase.from("transactions").insert({
          borrower_club_id: user.user_id,
          inventory_id: selectedItem.inventory_id,
          quantity: requestForm.quantity,
          due_date: requestForm.due_date || null,
          status: TRANSACTION_STATUS.PROCESSING,
          message: requestForm.message || null,
        });

        if (error) throw error;
        toast.success("Request submitted successfully");
      }
      // Case 2: User is a student who is a member of the club - direct borrow
      else if (user.role === "student" && selectedItem.is_member) {
        const { error } = await supabase.from("transactions").insert({
          student_id: user.user_id,
          inventory_id: selectedItem.inventory_id,
          quantity: requestForm.quantity,
          due_date: requestForm.due_date || null,
          status: TRANSACTION_STATUS.PROCESSING,
          message: requestForm.message || null,
        });

        if (error) throw error;
        toast.success("Request submitted successfully");
      }
      // Case 3: User is a student who is NOT a member - request through department
      else if (user.role === "student" && !selectedItem.is_member) {
        // First, get student's department
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("dept_id")
          .eq("usn", user.user_id)
          .single();

        if (studentError || !student?.dept_id) {
          toast.error("Could not find your department");
          return;
        }

        // Create transaction with status "Department Approval Pending"
        const { data: transaction, error: transError } = await supabase
          .from("transactions")
          .insert({
            student_id: user.user_id,
            inventory_id: selectedItem.inventory_id,
            quantity: requestForm.quantity,
            due_date: requestForm.due_date || null,
            status: TRANSACTION_STATUS.DEPARTMENT_PENDING,
            message: requestForm.message || null,
          })
          .select()
          .single();

        if (transError) throw transError;

        // Create department request
        const { error: deptError } = await supabase
          .from("department_requests")
          .insert({
            dept_id: student.dept_id,
            usn: user.user_id,
            transaction_id: transaction.transaction_id,
          });

        if (deptError) throw deptError;
        toast.success("Request submitted through department");
      } else {
        toast.error("Invalid user role for borrowing");
        return;
      }

      setRequestDialogOpen(false);
      setSelectedItem(null);
      fetchInventory(); // Refresh inventory to update quantities
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.club_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Inventory</h1>
          <p className="text-muted-foreground">
            Browse and request items from clubs
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Inventory Grid */}
        {filteredInventory.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery ? "No items found matching your search" : "No inventory items available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => (
              <Card key={item.inventory_id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={item.is_member ? "success" : "secondary"}>
                      {item.is_member ? "Member" : "Public"}
                    </Badge>
                  </div>
                  <CardDescription>{item.club_name}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <img
                      src={
                        item.image?.trim()
                          ? item.image
                          : "/placeholder.png"
                      }
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.png"; // fallback if invalid
                      }}
                      alt="Inventory Image"
                      className="w-full h-[250px] object-contain rounded-md"
                    />
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    {item.description || "No description"}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-medium">{item.quantity}</span>
                    </div>
                    {item.cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium">₹{item.cost}</span>
                      </div>
                    )}
                  </div>
                  <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        onClick={() => handleRequest(item)}
                        disabled={item.quantity === 0||user?.role=="faculty"}
                      >
                        Request Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request {selectedItem?.name}</DialogTitle>
                        <DialogDescription>
                          {user?.role === "club"
                            ? "Submit a direct borrow request as a club"
                            : selectedItem?.is_member
                            ? "Submit a direct request to the club"
                            : "This request will be routed through your department"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-4">
                            {/* Quantity Section */}
                            <div className="flex flex-col w-1/2">
                              <Label htmlFor="quantity" className="mb-2">Quantity *</Label>
                              <Input
                                id="quantity"
                                type="number"
                                min="1"
                                max={selectedItem?.quantity}
                                value={requestForm.quantity}
                                onChange={(e) =>
                                  setRequestForm({
                                    ...requestForm,
                                    quantity: parseInt(e.target.value) || 1,
                                  })
                                }
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Available: {selectedItem?.quantity}
                              </p>
                            </div>

                            {/* Due Date Picker */}
                            <div className="flex flex-col w-1/2">
                              <Label className="mb-2">Due Date</Label>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {requestForm.due_date
                                      ? format(new Date(requestForm.due_date), "PPP")
                                      : "Pick a due date"}
                                  </Button>
                                </PopoverTrigger>

                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={requestForm.due_date ? new Date(requestForm.due_date) : undefined}
                                    onSelect={(date) =>
                                      setRequestForm({
                                        ...requestForm,
                                        due_date: date ? date.toISOString().split("T")[0] : "",
                                      })
                                    }
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                        <div>
                          <Label htmlFor="message" className="mb-2">Message (Optional)</Label>
                          <Textarea
                            id="message"
                            value={requestForm.message}
                            onChange={(e) =>
                              setRequestForm({ ...requestForm, message: e.target.value })
                            }
                            placeholder="Add any additional notes..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setRequestDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={submitRequest} disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit Request"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

