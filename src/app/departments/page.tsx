"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Search, ArrowRight } from "lucide-react";

interface Department {
  dept_id: string;
  name: string;
  description: string | null;
}

export default function DepartmentsListPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("departments")
          .select("dept_id, name, description")
          .order("name", { ascending: true });

        if (error) throw error;
        setDepartments(data || []);
      } catch (err) {
        console.error("Error fetching departments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const filtered = departments.filter((dept) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      dept.name.toLowerCase().includes(q) ||
      dept.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Departments</h1>
            <p className="text-muted-foreground max-w-2xl">
              Browse all departments and view the faculty members associated with each.
            </p>
          </div>
          <div className="w-full sm:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">
            Loading departments...
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No departments found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((dept) => (
              <Card
                key={dept.dept_id}
                className="flex flex-col border transition-all hover:shadow-md hover:border-primary/60"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-4 w-4 text-primary" />
                      {dept.name}
                    </CardTitle>
                  </div>
                  {dept.description && (
                    <CardDescription className="mt-2 line-clamp-3">
                      {dept.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => router.push(`/departments/${dept.dept_id}`)}
                  >
                    View Details
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


