"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUserInfo } from "@/hooks/useUserInfo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Package, ArrowLeft, Mail,ArrowRight } from "lucide-react";

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

export default function ClubPublicPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUserInfo();

  const clubId = params?.clubId as string;

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const isClubEmailEditor =
    !!club && !!user && user.role === "club" && user.user_id === club.club_id && user.email === club.email;

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
          </>
        )}
      </div>
    </div>
  );
}


