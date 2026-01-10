'use client';
import { Menu, X, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUserInfo } from '@/hooks/useUserInfo';
import { AnimatedThemeToggler } from './ui/animated-theme-toggler';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  { label: "Explore", path: "/#links" },
  { label: "Student", path: "/student" },
  { label: "Inventory", path: "/inventory" },
  { label: "Clubs", path: "/clubs" },
  { label: "Departments", path: "/departments" },
  { label: "AI Chat", path: "/chat" },
  { label: "Admin", path: "/admin" },
];

const Header = () => {
  const { user, loading } = useUserInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // Public routes that don't require authentication
    if (path === "/" || path === "/inventory"||path=="/#links") {
      setIsMenuOpen(false);
      return;
    }
    // Protected routes
    if (!user) {
      setIsMenuOpen(false);
      e.preventDefault();
      toast("Please login first!");
      router.push("/login");
    } else {
      setIsMenuOpen(false);
      router.push(`${path}`);
    }
  };

  return (
    <header className="sticky top-0 border-b border-border bg-background/30 backdrop-blur-sm relative z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
  
        {/* ================= DESKTOP HEADER ================= */}
        <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center">
  
          {/* LEFT: Logo */}
          <div className="flex items-center gap-2">
            <AnimatedThemeToggler className="p-1 rounded-full hover:bg-foreground hover:text-background" />
            <Button
              className="text-xl text-foreground bg-transparent hover:bg-transparent cursor-pointer"
              onClick={() => router.push("/")}
            >
              Clubsync
            </Button>
          </div>
  
          {/* CENTER: Navigation */}
          <nav className="flex justify-center items-center space-x-6 xl:space-x-8">
            {navItems.map(({ label, path }) => (
              <Link
                key={label}
                href={path}
                onClick={e => handleNavClick(e, path)}
                className={`
                  relative px-2 py-1 text-foreground/80 text-md xl:text-lg tracking-wide
                  transition-colors duration-300 hover:font-bold whitespace-nowrap
                  after:absolute after:left-0 after:bottom-0 after:h-[2px] after:bg-foreground
                  after:transition-all after:duration-500
                  ${pathname === path
                    ? "font-bold after:w-full"
                    : "after:w-0 hover:after:w-full"}
                `}
              >
                {label}
              </Link>
            ))}
          </nav>
  
          {/* RIGHT: Auth */}
          <div className="flex justify-end items-center gap-3">
            {!loading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <Avatar className="h-9 w-9 border-2 border-border hover:border-primary transition-colors">
                      <AvatarImage src="" alt={user.name || user.email} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name
                          ? user.name
                              .split(" ")
                              .map(n => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : user.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
  
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {user.role && (
                        <p className="text-xs leading-none text-muted-foreground mt-1">
                          Role: <span className="capitalize">{user.role}</span>
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
  
                  <DropdownMenuSeparator />
  
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.success("Logged out successfully");
                      router.push("/");
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/login")}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/signup")}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
  
        {/* ================= MOBILE HEADER ================= */}
        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <AnimatedThemeToggler className="p-1 rounded-full" />
            <Button
              className="text-xl text-foreground bg-transparent hover:bg-transparent cursor-pointer"
              onClick={() => router.push("/")}
            >
              Clubsync
            </Button>
          </div>
  
          <div className="flex items-center gap-3">
            {!loading && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none">
                    <Avatar className="h-9 w-9 border-2 border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
  
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.success("Logged out successfully");
                      router.push("/");
                    }}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
  
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-foreground"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
  
        {/* ================= MOBILE MENU ================= */}
        {isMenuOpen && (
          <nav className="lg:hidden mt-4 border-t border-border pt-4">
            <div className="flex flex-col space-y-3">
              {navItems.map(({ label, path }) => (
                <Link
                  key={label}
                  href={path}
                  onClick={e => handleNavClick(e, path)}
                  className={`
                    px-3 py-2 text-foreground/80 rounded-md
                    hover:bg-muted/50
                    ${pathname === path ? "font-bold bg-muted/30" : ""}
                  `}
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}  
export default Header;
