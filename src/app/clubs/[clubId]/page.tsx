"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUserInfo } from "@/hooks/useUserInfo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  ArrowLeft,
  Mail,
  ArrowRight,
  Loader2,
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { getFundTypeLabel } from "@/lib/fundTypeStatus";

interface Club {
  club_id: string;
  name: string;
  email: string | null;
  description: string | null;
}

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
  image: string | null;
  is_public: boolean;
}

interface Fund {
  fund_id: string;
  name: string | null;
  amount: number | null;
  description: string | null;
  is_credit: boolean;
  type: number;
  bill_date: string | null;
  submitted_by_name?: string | null;
}

export default function ClubPublicPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserInfo();

  const clubId = params?.clubId as string;

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundsError, setFundsError] = useState<string | null>(null);
  const [isMemberOfClub, setIsMemberOfClub] = useState(false);

  useEffect(() => {
    if (!clubId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [{ data: clubData }, { data: membersData }, { data: inventoryData }] =
          await Promise.all([
            supabase
              .from("clubs")
              .select("club_id, name, email, description")
              .eq("club_id", clubId)
              .single(),
            supabase
              .from("memberships")
              .select(
                `
                member_id,
                usn,
                role,
                students:usn (
                  name,
                  email
                )
              `
              )
              .eq("club_id", clubId),
            supabase
              .from("inventory")
              .select("inventory_id, name, description, quantity, image, is_public")
              .eq("club_id", clubId)
              .eq("is_public", true),
          ]);

        if (clubData) {
          setClub(clubData as Club);
        }

        if (membersData) {
          const formattedMembers: Member[] = (membersData as any[]).map((m) => ({
            member_id: m.member_id,
            usn: m.usn,
            name: m.students?.name || "Unknown",
            email: m.students?.email || "",
            role: m.role || "Member",
          }));
          setMembers(formattedMembers);
        }

        setInventory((inventoryData as InventoryItem[]) || []);
      } catch (err) {
        console.error("Error loading club page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clubId]);

  useEffect(() => {
    if (!user?.user_id) {
      setIsMemberOfClub(false);
      return;
    }

    setIsMemberOfClub(members.some((member) => member.usn === user.user_id));
  }, [members, user]);

  const isClubEmailEditor =
    !!club && !!user && user.role === "club" && user.user_id === club.club_id && user.email === club.email;

  const canViewFunds = isClubEmailEditor || isMemberOfClub;

  useEffect(() => {
    if (!clubId || !canViewFunds) return;

    const fetchFunds = async () => {
      try {
        setFundsLoading(true);
        setFundsError(null);

        const { data, error } = await supabase
          .from("funds")
          .select(
            `
            fund_id,
            name,
            amount,
            description,
            is_credit,
            type,
            bill_date,
            submitted_by,
            submitted_by_member:submitted_by (
              usn,
              students:usn (
                name
              )
            )
          `
          )
          .eq("club_id", clubId)
          .eq("is_trashed", false)
          .order("bill_date", { ascending: false, nullsFirst: false });

        if (error) throw error;

        const formattedFunds: Fund[] =
          data?.map((fund: any) => ({
            ...fund,
            submitted_by_name: fund.submitted_by_member?.students?.name || fund.submitted_by_member?.usn || "Unknown",
          })) || [];

        setFunds(formattedFunds);
      } catch (err: any) {
        console.error("Error fetching funds:", err);
        setFundsError("Failed to load funds for this club.");
      } finally {
        setFundsLoading(false);
      }
    };

    fetchFunds();
  }, [clubId, canViewFunds]);

  const formatCurrency = (value?: number | null) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value ?? 0);

  const totalIncome = funds.filter((fund) => fund.is_credit).reduce((sum, fund) => sum + (fund.amount || 0), 0);
  const totalExpense = funds.filter((fund) => !fund.is_credit).reduce((sum, fund) => sum + (fund.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="mb-2 -ml-2 inline-flex items-center gap-2"
          onClick={() => router.push("/clubs")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all clubs
        </Button>
        {isClubEmailEditor && (
                <Button
                    variant="ghost"
                    className="mb-2 -ml-2 inline-flex items-center gap-2"
                    onClick={() => router.push("/club")}
                    >
                    Manage Club
                    <ArrowRight className="h-4 w-4" />
            </Button>
            )}
            </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">Loading club details...</div>
        ) : !club ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Club not found.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {club.name}
                  </CardTitle>
                  {club.email && (
                    <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{club.email}</span>
                    </div>
                  )}
                  {club.description && (
                    <CardDescription className="mt-3 max-w-2xl">{club.description}</CardDescription>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary">Public Club Page</Badge>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Members
                  </CardTitle>
                  <CardDescription>
                    View current members of this club. Contact the club to join or learn more.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members listed yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>USN</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.member_id}>
                              <TableCell className="font-mono text-xs sm:text-sm">{member.usn}</TableCell>
                              <TableCell>{member.name}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{member.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {member.role}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Public Inventory
                  </CardTitle>
                  <CardDescription>
                    Items this club has chosen to make visible to everyone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inventory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No public inventory items.</p>
                  ) : (
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {inventory.map((item) => (
                        <div
                          key={item.inventory_id}
                          className="border rounded-md p-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{item.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {item.description}
                            </p>
                          )}
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="mt-1 h-28 w-full rounded-md object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {canViewFunds && (
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IndianRupee className="h-5 w-5 text-primary" />
                      Funds Overview
                    </CardTitle>
                    <CardDescription>
                      Detailed fund records are visible only to club members and club administrators.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="self-start">
                    Members Only
                  </Badge>
                </CardHeader>
                <CardContent>
                  {fundsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading funds...</span>
                    </div>
                  ) : fundsError ? (
                    <p className="text-sm text-red-500">{fundsError}</p>
                  ) : funds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No funds have been recorded for this club yet.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg border p-4">
                          <p className="text-xs uppercase text-muted-foreground">Total Income</p>
                          <p className="text-2xl font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-xs uppercase text-muted-foreground">Total Expenditure</p>
                          <p className="text-2xl font-semibold text-red-600">{formatCurrency(totalExpense)}</p>
                        </div>
                        <div className="rounded-lg border p-4">
                          <p className="text-xs uppercase text-muted-foreground">Net Balance</p>
                          <p className={`text-2xl font-semibold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(netBalance)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Transaction</TableHead>
                              <TableHead>Bill Date</TableHead>
                              <TableHead>Submitted By</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {funds.map((fund) => (
                              <TableRow key={fund.fund_id}>
                                <TableCell className="font-medium">{fund.name || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{getFundTypeLabel(fund.type)}</Badge>
                                </TableCell>
                                <TableCell className="font-semibold">{formatCurrency(fund.amount)}</TableCell>
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
                                  {fund.bill_date ? new Date(fund.bill_date).toLocaleDateString() : "-"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {fund.submitted_by_name || "-"}
                                </TableCell>
                                <TableCell className="max-w-[240px]">
                                  <p className="text-sm text-muted-foreground line-clamp-3">
                                    {fund.description || "-"}
                                  </p>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}


