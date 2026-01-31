"use client";

import { useRouter } from "next/navigation";
import { useUserInfo } from "@/hooks/useUserInfo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Package, FileCheck, Shield, Zap, ArrowRight } from "lucide-react";
import MenuTable from "@/components/MenuItems";
export default function Home() {
  const { user, loading } = useUserInfo();
  const router = useRouter();

  const features = [
    {
      icon: Users,
      title: "Member Management",
      description:
        "Maintain complete control over club members with easy add, update, and bulk operations.",
    },
    {
      icon: Package,
      title: "Inventory Tracking",
      description:
        "Track items effortlessly. Manage public and private inventory with streamlined borrowing workflows.",
    },
    {
      icon: FileCheck,
      title: "Request Management",
      description:
        "Approve and reject inventory requests seamlessly with automated, clear workflows.",
    },
    {
      icon: Shield,
      title: "Department Integration",
      description:
        "Enable faculty-level visibility for cross-club oversight and departmental approvals.",
    },
  ];

  const roleButtons: Record<string, { label: string; href: string }> = {
    club: { label: "Manage Club", href: "/club" },
    student: { label: "Student Dashboard", href: "/student" },
    faculty: { label: "Department", href: "/department" },
    admin: { label: "Admin Console", href: "/dashboard" },
  };

  const roleBtn = user?.role && user.role !== "notset" ? roleButtons[user.role] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden border-b flex flex-col items-center justify-center min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                ClubSync
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              A unified platform to manage members, inventory, requests, and
              club operations—efficiently and effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!loading && user ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  className="text-base px-8 w-fit self-start"
                  onClick={() => router.push("/inventory")}
                >
                  Browse Inventory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            
                {roleBtn && (
                  <Button
                    variant="outline"
                    className="text-base px-8 w-fit self-start"
                    onClick={() => router.push(roleBtn.href)}
                  >
                    {roleBtn.label}
                  </Button>
                )}
              </div>
              ) : (
                <>
                  <Button size="lg" className="text-base px-8" onClick={() => router.push("/signup")}>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base px-8"
                    onClick={() => router.push("/login")}
                  >
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Platform Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to simplify every aspect of club and inventory management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={idx}
                  className="p-6 border transition-all duration-300 hover:shadow-xl hover:border-primary/60 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      <MenuTable />

      {/* CTA */}
      <section className="py-24 sm:py-32 border-t bg-gradient-to-b from-transparent to-primary/5/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Zap className="h-8 w-8 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start Your Journey</h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Whether you're a student, club lead, or faculty member—ClubSync brings
            clarity and organization to every workflow.
          </p>

          {!loading && !user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8" onClick={() => router.push("/signup")}>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Extra Component Section */}
     
    </div>
  );
}
