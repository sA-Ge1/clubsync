"use client";

import { useRouter } from "next/navigation";
import { useUserInfo } from "@/hooks/useUserInfo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Package, FileCheck, Shield, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useUserInfo();
  const router = useRouter();

  const features = [
    {
      icon: Users,
      title: "Member Management",
      description: "Easily manage club members with bulk add and remove functionality. Keep track of all your members in one place.",
    },
    {
      icon: Package,
      title: "Inventory Tracking",
      description: "Track and manage your club's inventory. Set items as public or private, and handle borrowing requests seamlessly.",
    },
    {
      icon: FileCheck,
      title: "Request Management",
      description: "Approve or reject inventory requests from students. Streamline the borrowing process with automated workflows.",
    },
    {
      icon: Shield,
      title: "Department Integration",
      description: "Seamless integration with departments for cross-club requests. Faculty can manage requests efficiently.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                ClubSync
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              The all-in-one platform for managing your club, inventory, and member requests.
              Streamline operations and focus on what matters most.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!loading && user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => router.push("/inventory")}
                    className="text-base px-8"
                  >
                    Browse Inventory
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/club")}
                    className="text-base px-8"
                  >
                    Manage Club
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => router.push("/signup")}
                    className="text-base px-8"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push("/login")}
                    className="text-base px-8"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your club efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-6 hover:shadow-lg transition-shadow duration-300 border-2 hover:border-primary/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join clubs, manage inventory, and streamline your operations with ClubSync.
          </p>
          {!loading && !user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/signup")}
                className="text-base px-8"
              >
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/login")}
                className="text-base px-8"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
