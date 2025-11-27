"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Users, Search, ArrowRight, Mail } from "lucide-react";

interface Club {
  club_id: string;
  name: string;
  email: string | null;
  description: string | null;
}

export default function ClubsListPage() {
  const router = useRouter();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("clubs")
          .select("club_id, name, email, description")
          .order("name", { ascending: true });

        if (error) throw error;

        setClubs(data || []);
      } catch (err) {
        console.error("Error fetching clubs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filtered = clubs.filter((club) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      club.name.toLowerCase().includes(q) ||
      (club.description?.toLowerCase() ?? "").includes(q) ||
      (club.email?.toLowerCase() ?? "").includes(q)
    );
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Clubs</h1>
            <p className="text-muted-foreground max-w-2xl">
              Explore all registered clubs, read about them, and discover their members and activities.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs by name, email, or description..."
              value={search}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center text-muted-foreground py-16">
            Loading clubs...
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No clubs found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((club) => (
              <Card
                key={club.club_id}
                className="flex flex-col border transition-all hover:shadow-md hover:border-primary/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-4 w-4 text-primary" />
                        {club.name}
                      </CardTitle>

                      {club.email && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{club.email}</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {club.description && (
                    <CardDescription className="mt-2 line-clamp-3">
                      {club.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="mt-auto pt-0">
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => router.push(`/clubs/${club.club_id}`)}
                  >
                    View Club
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>

              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
