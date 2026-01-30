import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type StaticNavProps = {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactNode;
  }[];
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onMobileMenuOpen?: () => void;
  className?: string;
};

export function StaticNav({
  navItems,
  leftSlot,
  rightSlot,
  onMobileMenuOpen,
  className,
}: StaticNavProps) {
  return (
    <header
      className={cn(
        "w-full flex justify-center",
        "border-b bg-background/80 backdrop-blur-md py-1",
        className
      )}
    >
      <div
        className={cn(
          " w-full max-w-6xl",
          "px-6 py-2",
          "flex items-center justify-between md:ml-10"
        )}
      >
        {/* LEFT */}
        <div className="flex items-center gap-3">
          {leftSlot}
        </div>

        {/* CENTER (DESKTOP) */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.link}
              className="flex items-center gap-2 text-md font-medium text-muted-foreground hover:text-foreground transition whitespace-nowrap"
            >
              {item.icon}
              <span>{item.name}</span>
            </a>
          ))}
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3">
            {rightSlot}
          </div>

          {/* Mobile menu */}
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-2 rounded-md hover:bg-muted"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
