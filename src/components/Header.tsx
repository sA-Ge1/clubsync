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
  { label: "Home", path: "/" },
  { label: "Explore", path: "/#links" },
  { label: "Student", path: "/student" },
  { label: "Inventory", path: "/inventory" },
  { label: "Clubs", path: "/clubs" },
  { label: "Departments", path: "/departments" },
  { label: "AI Chat", path: "/chat" },
];

const Header = () => {
  const { user, loading } = useUserInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // Public routes that don't require authentication
    if (path === "/" || path === "/inventory") {
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
    <header className="sticky top-0 border-b border-border bg-background backdrop-blur-sm relative z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center text-xl gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          <AnimatedThemeToggler/> ClubSync
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navItems.map(({ label, path }) => (
              <Link
                key={label}
                href={path}
                className={`
                  relative px-2 py-1 text-foreground/80 text-md xl:text-lg tracking-wide transition-colors duration-300
                  hover:font-bold whitespace-nowrap
                  after:absolute after:left-0 after:bottom-0 after:h-[2px] after:bg-foreground 
                  after:transition-all after:duration-500
                  ${pathname === path 
                    ? "font-bold after:w-full" 
                    : "after:w-0 hover:after:w-full"}
                `}
                onClick={e => handleNavClick(e, path)}
              >
                {label}
              </Link>
            ))}

            {/* Desktop Auth Section */}
            <div className="flex items-center gap-2 xl:gap-3 ml-4 xl:ml-6">
              {!loading && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                      <Avatar className="h-9 w-9 border-2 border-border hover:border-primary transition-colors">
                        <AvatarImage src="" alt={user.name || user.email} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.name
                            ? user.name
                                .split(" ")
                                .map((n) => n[0])
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
                    className="text-xs xl:text-sm px-3 xl:px-4"
                    onClick={() => router.push("/login")}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs xl:text-sm px-3 xl:px-4"
                    onClick={() => router.push("/signup")}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            {!loading && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <Avatar className="h-9 w-9 border-2 border-border">
                      <AvatarImage src="" alt={user.name || user.email} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name
                          ? user.name
                              .split(" ")
                              .map((n) => n[0])
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
            )}
            <button
              className="text-foreground hover:text-foreground/80 transition-colors p-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="lg:hidden mt-4 border-t border-border pt-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-3">
              {navItems.map(({ label, path }) => (
                <Link
                  key={label}
                  href={path}
                  className={`
                    relative px-3 py-2 text-foreground/80 text-base tracking-wide transition-colors duration-300
                    hover:font-bold hover:bg-muted/50 rounded-md
                    ${pathname === path ? "font-bold bg-muted/30" : ""}
                  `}
                  onClick={e => handleNavClick(e, path)}
                >
                  {label}
                </Link>
              ))}
              
              {/* Mobile Auth Section */}
              {!loading && !user && (
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/login");
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/signup");
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
