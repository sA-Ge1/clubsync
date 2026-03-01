"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
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
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavBody,
  NavItems,
  Navbar,
} from "./ui/resizable-navbar";

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
  const navItems = [
    { name: "Home", link: "/" },
    { name: "Student", link: "/student" },
    { name: "Inventory", link: "/inventory" },
    { name: "Clubs", link: "/clubs" },
    { name: "Departments", link: "/departments" },
    { name: "AI Chat", link: "/ai-assistant" },
    { name: "Admin", link: "/dashboard" },
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
  if (
    pathname.startsWith("/ai-assistant")
  ) {
    return null;
  }

  const rightSlot = (
    <>
      {!loading && user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all hover:scale-105">
              <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm">
                <AvatarImage src={user.avatar || ""} className="object-cover" />
                <AvatarFallback className="bg-background text-foreground text-xs font-semibold">
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
            <DropdownMenuSeparator className="text-foreground" />

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
      <AnimatedThemeToggler />
    </>
  );

  return (
    <>
      <Navbar className="top-2 z-[5000]">
        <NavBody>
            ClubSync

          <NavItems items={navItems} onItemClick={handleNav} />

          <div className="flex items-center gap-3">{rightSlot}</div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <Button
              variant="ghost"
              className="text-lg font-semibold"
              onClick={() => router.push("/")}
            >
              ClubSync
            </Button>
            <MobileNavToggle
              isOpen={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            />
          </MobileNavHeader>

          <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNav(item.link)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  pathname === item.link || pathname.startsWith(`${item.link}/`)
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.name}
              </button>
            ))}

            <div className="w-full border-t pt-4 flex items-center justify-between gap-3">
              <AnimatedThemeToggler />

              {user ? (
                <div className="flex items-center gap-3 ml-auto">
                  <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={user.avatar || ""} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-semibold">
                      {getUserInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.success("Logged out");
                      setMobileOpen(false);
                      router.push("/");
                    }}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/login");
                  }}
                >
                  Login
                </Button>
              )}
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

    </>
  );
}
