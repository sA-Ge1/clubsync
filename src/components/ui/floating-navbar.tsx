"use client";

import { ReactNode, useState,useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
type NavItem = {
  name: string;
  link: string;
  icon?: ReactNode;
};

type FloatingNavProps = {
  navItems: NavItem[];
  leftSlot: ReactNode;
  rightSlot: ReactNode;
  onMobileMenuOpen: () => void;
  className?: string;
};

export const FloatingNav = ({
  navItems,
  leftSlot,
  rightSlot,
  onMobileMenuOpen,
  className,
}: FloatingNavProps) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const clearHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };
  
  const startIdleHideTimer = () => {
    clearHideTimer();
  
    hideTimeoutRef.current = setTimeout(() => {
      if (!isInteracting) {
        setVisible(false);
      }
    }, 2000);
  };
  
  const showHeader = () => {
    clearHideTimer();
    setVisible(true);
    startIdleHideTimer(); // auto-hide ONLY if idle
  };
  
  const hideHeaderImmediately = () => {
    clearHideTimer();
    setVisible(false);
  };
  
  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current !== "number") return;
  
    const prev = scrollYProgress.getPrevious() ?? current;
    const direction = current - prev;
  
    // Ignore micro scroll noise
    if (Math.abs(direction) < 0.002) return;
  
    if (direction > 0) {
      // ⬇ scrolling down → hide immediately
      hideHeaderImmediately();
    } else {
      // ⬆ scrolling up → show + start idle timer
      showHeader();
    }
  });
  useEffect(() => {
    if (!visible) return;
    startIdleHideTimer();
    return () => {
      clearHideTimer();
    };
  }, [visible]);
  

  return (
    <AnimatePresence>
      <motion.div
      onMouseEnter={() => {
        setIsInteracting(true);
        clearHideTimer();
      }}
      onMouseLeave={() => {
        setIsInteracting(false);
        startIdleHideTimer();
      }}
      onTouchStart={() => {
        setIsInteracting(true);
        clearHideTimer();
      }}
      onFocusCapture={() => {
        setIsInteracting(true);
        clearHideTimer();
      }}
      onBlurCapture={() => {
        setIsInteracting(false);
        startIdleHideTimer();
      }}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed top-3 inset-x-0 mx-auto z-[5000]",
          "max-w-6xl",
          "rounded-full border bg-background/80 backdrop-blur-md shadow-lg",
          "px-6 py-2",
          className
        )}
      >
        <div className="relative flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            {leftSlot}
          </div>

          {/* CENTER (DESKTOP ONLY) */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-6">
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
            {/* Desktop actions */}
            <div className="hidden lg:flex items-center gap-3">
              {rightSlot}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuOpen}
              className="lg:hidden p-2 rounded-md hover:bg-muted"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
