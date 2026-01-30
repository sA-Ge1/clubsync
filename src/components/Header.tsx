"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  GraduationCap,
  Boxes,
  Users,
  Building2,
  Bot,
  Shield,
  LogOut,
  X,
} from "lucide-react";
import { ReactNode } from "react";
import { toast } from "sonner";
import { FloatingNav } from "./ui/floating-navbar";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { useUserInfo } from "@/hooks/useUserInfo";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { StaticNav } from "./ui/StaticNave";

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

const getUserInitials = (name?: string, email?: string) =>
  name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : email?.[0].toUpperCase() ?? "U";

/* ---------------------------------------------
   Header
--------------------------------------------- */

export default function Header() {
  const { user, loading } = useUserInfo();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: {
    name: string;
    link: string;
    icon?: ReactNode;
  }[] = [
    { name: "Explore", link: "/#links", icon: <Compass size={20} className="text-emerald-400" /> },

    { name: "Student", link: "/student", icon: <GraduationCap size={20} className="text-amber-400" /> },

    { name: "Inventory", link: "/inventory", icon: <Boxes size={20} className="text-sky-400" /> },

    { name: "Clubs", link: "/clubs", icon: <Users size={20} className="text-rose-400" /> },

    { name: "Departments", link: "/departments", icon: <Building2 size={20} className="text-indigo-400" /> },

    { name: "AI Chat", link: "/chat", icon: <Bot size={20} className="text-orange-400" /> },

    { name: "Admin", link: "/dashboard", icon: <Shield size={20} className="text-foreground" /> },

  ];

  const handleNav = (link: string) => {
    const publicRoutes = ["/", "/inventory", "/#links"];

    if (!publicRoutes.includes(link) && !user) {
      toast("Please login first!");
      router.push("/login");
      return;
    }

    router.push(link);
    setMobileOpen(false);
  };

  return (
    <>
      <StaticNav
        navItems={navItems}
        onMobileMenuOpen={() => setMobileOpen(true)}
        leftSlot={
          <Button
            variant="ghost"
            className="text-xl font-semibold"
            onClick={() => router.push("/")}
          >
            ClubSync
          </Button>
        }
        rightSlot={
          <>
            <AnimatedThemeToggler />

            {!loading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none">
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={user.avatar || ""} />
                      <AvatarFallback>
                        {getUserInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  sideOffset={20}
                  className="z-[6000]"
                >
                 <DropdownMenuItem className="focus:bg-transparent">
                  <table className="text-sm w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="pr-2 font-medium text-muted-foreground">Name</td>
                        <td className="font-semibold capitalize">{user.name}</td>
                      </tr>
                      <tr>
                        <td className="pr-2 font-medium text-muted-foreground">Role</td>
                        <td className="font-semibold capitalize">{user.role}</td>
                      </tr>
                      <tr>
                        <td className="pr-2 font-medium text-muted-foreground">ID</td>
                        <td className="font-mono text-xs">{user.user_id}</td>
                      </tr>
                    </tbody>
                  </table>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="text-foreground"/>


                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.success("Logged out");
                      router.push("/");
                    }}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => router.push("/login")}>
                Login
              </Button>
            )}
          </>
        }
      />

      {/* ================= MOBILE SLIDE-OVER ================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[6000] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <aside className="absolute right-0 top-0 h-full w-72 bg-background shadow-2xl animate-in slide-in-from-right flex flex-col">
            
            {/* ================= HEADER ================= */}
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="text-xl font-semibold flex items-center justify-center gap-5"><AnimatedThemeToggler /> Menu </span>
                

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ================= NAV ================= */}
            <nav className="flex-1 overflow-y-auto py-2">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNav(item.link)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                    "hover:bg-muted",
                    pathname === item.link
                      ? "font-semibold bg-muted/60"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>

            {/* ================= FOOTER ================= */}
            <div className="border-t px-4 py-4 space-y-4">
              
              {/* User Info */}
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border">
                    <AvatarImage src={user.avatar || ""} />
                    <AvatarFallback>
                      {getUserInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.success("Logged out");
                      setMobileOpen(false);
                    }}
                    className="text-destructive hover:bg-destructive/10 rounded-md p-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/login");
                  }}
                >
                  Login
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}

    </>
  );
}
