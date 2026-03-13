"use client";

import { useRouter } from "next/navigation";
import { useUserInfo } from "@/hooks/useUserInfo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Package, FileCheck, Shield, Zap, ArrowRight, Sparkles, TrendingUp, Clock, Award, Bot, Building2 } from "lucide-react";
import MenuTable from "@/components/MenuItems";
import { LayoutGroup, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

export default function Home() {
  const { user, loading } = useUserInfo();
  const router = useRouter();
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  const ctaRef = useRef(null);
  
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  const features = [
    {
      icon: Users,
      title: "Member Management",
      description:
        "Maintain complete control over club members with easy add, update, and bulk operations.",
      color: "from-background to-foreground/40",
    },
    {
      icon: Package,
      title: "Inventory Tracking",
      description:
        "Track items effortlessly. Manage public and private inventory with streamlined borrowing workflows.",
      color: "from-background to-foreground/40",
    },
    {
      icon: Building2,
      title: "Department Integration",
      description:
        "Enable faculty-level visibility for cross-club oversight and departmental approvals.",
      color: "from-background to-foreground/40",
    },
    {
      icon: Bot,
      title: "AI Chat Assistant",
      description:
        "Use AI chat for Q&A, document insights, workflow guidance, and smart support across ClubSync modules.",
      color: "from-background to-foreground/40",
    },
  ];

  const stats = [
    { icon: TrendingUp, label: "Efficiency Boost", value: "10x", color: "text-blue-500" },
    { icon: Clock, label: "Time Saved", value: "85%", color: "text-purple-500" },
    { icon: Award, label: "User Satisfaction", value: "99%", color: "text-green-500" },
    { icon: Sparkles, label: "Active Users", value: "5K+", color: "text-orange-500" },
  ];

  const roleButtons: Record<string, { label: string; href: string }> = {
    club: { label: "Manage Club", href: "/club" },
    student: { label: "Student Dashboard", href: "/student" },
    faculty: { label: "Department", href: "/department" },
    admin: { label: "Admin Console", href: "/dashboard" },
  };

  const roleBtn = user?.role && user.role !== "notset" ? roleButtons[user.role] : null;

  const [heroScreenshots, setHeroScreenshots] = useState([
    { src: "/dashboard-preview.png", alt: "Dashboard Preview" },
    { src: "/clubs.png", alt: "Clubs Preview" },
    { src: "/student.png", alt: "Student Dashboard Preview" },
    { src: "/aichat.png", alt: "AI Chat Preview" },
    { src: "/inventory.png", alt: "Inventory Preview" },
  ]);
  const [isMobile, setIsMobile] = useState(false);

  const swapToCenter = (sideIndex: number) => {
    setHeroScreenshots((prev) => {
      if (sideIndex <= 0 || sideIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      [next[0], next[sideIndex]] = [next[sideIndex], next[0]];
      return next;
    });
  };

  useEffect(() => {
    const mobileMediaQuery = window.matchMedia("(max-width: 767px)");

    const updateMobileState = () => {
      setIsMobile(mobileMediaQuery.matches);
    };

    updateMobileState();
    mobileMediaQuery.addEventListener("change", updateMobileState);

    return () => {
      mobileMediaQuery.removeEventListener("change", updateMobileState);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const rotationTimer = window.setInterval(() => {
      setHeroScreenshots((prev) => {
        if (prev.length <= 1) {
          return prev;
        }

        return [...prev.slice(1), prev[0]];
      });
    }, 3200);

    return () => {
      window.clearInterval(rotationTimer);
    };
  }, [isMobile]);
  
  return (
    <div className="relative min-h-screen bg-background">

      <BackgroundRippleEffect/>
      {/* HERO */}
      <main className="relative z-10">
          <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden pt-20">

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 z-10 w-full">
          {/* Text Content */}
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              Welcome to{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-foreground/10 to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  ClubSync
                </span>
                <motion.div
                  className="absolute -inset-1 blur-xl -z-10"
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              A unified platform to manage members, inventory, requests, and
              club operations—<span className="text-foreground font-semibold">efficiently and effortlessly.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              {!loading && user ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    size="lg"
                    className="text-base px-8 group relative overflow-hidden h-12"
                    onClick={() => router.push("/inventory")}
                  >
                    <span className="relative z-10 flex items-center">
                      Browse Inventory
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
            
                  {roleBtn && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-base px-8 border-2 hover:border-primary/50 hover:bg-primary/5 h-12"
                      onClick={() => router.push(roleBtn.href)}
                    >
                      {roleBtn.label}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="text-base px-8 group relative overflow-hidden h-12"
                    onClick={() => router.push("/signup")}
                  >
                    <span className="relative z-10 flex items-center">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base px-8 border-2 hover:border-primary/50 hover:bg-primary/5 h-12"
                    onClick={() => router.push("/login")}
                  >
                    Login
                  </Button>
                </>
              )}
            </motion.div>
          </div>

          {/* Visual Showcase - Floating Screenshots */}
          <div className="relative w-full max-w-6xl mx-auto perspective-1000">
            <LayoutGroup>
            <div className="relative h-[280px] sm:h-[600px] lg:h-[700px]">
              {/* Main center screenshot */}
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                layout
                layoutId={heroScreenshots[0].src}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] sm:w-[70%] lg:w-[60%] z-30"
              >
                <div className="relative group">
                  <div className="relative bg-background border-2 border-primary/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 via-purple-500/5 to-background ">
                      <div className="relative w-full h-full bg-gradient-to-br from-muted/50 to-muted/20 rounded-lg flex items-center justify-center">
                        <Image src={heroScreenshots[0].src} alt={heroScreenshots[0].alt} fill className="rounded-lg object-cover" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs sm:text-sm text-muted-foreground">
                    {heroScreenshots[0].alt}
                  </p>
                </div>
              </motion.div>

              {/* Top Left - Floating card */}
              <motion.div
                initial={{ opacity: 0, x: -100, y: -50 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                layout
                layoutId={heroScreenshots[1].src}
                className="absolute left-0 top-8 w-[45%] sm:w-[35%] lg:w-[28%] z-20 hidden md:block"
              >
                <motion.div
                  animate={{ 
                    y: [0, -15, 0],
                    rotate: [-2, -3, -2],
                  }}
                  transition={{ 
                    duration: 6, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="relative group cursor-pointer"
                  onClick={() => swapToCenter(1)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      swapToCenter(1);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition" />
                  <div className="relative bg-background border border-border/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="aspect-[16/9] bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                      <div className="relative w-full h-full bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center">
                        <Image src={heroScreenshots[1].src} alt={heroScreenshots[1].alt} fill className="rounded-lg object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Top Right - Floating card */}
              <motion.div
                initial={{ opacity: 0, x: 100, y: -50 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                layout
                layoutId={heroScreenshots[2].src}
                className="absolute right-0 top-20 w-[45%] sm:w-[35%] lg:w-[28%] z-20 hidden md:block"
              >
                <motion.div
                  animate={{ 
                    y: [0, 15, 0],
                    rotate: [2, 3, 2],
                  }}
                  transition={{ 
                    duration: 7, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="relative group cursor-pointer"
                  onClick={() => swapToCenter(2)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      swapToCenter(2);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition" />
                  <div className="relative bg-background border border-border/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="aspect-[16/9] bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                      <div className="relative w-full h-full bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center">
                        <Image src={heroScreenshots[2].src} alt={heroScreenshots[2].alt} fill className="rounded-lg object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Bottom Left - Floating card */}
              <motion.div
                initial={{ opacity: 0, x: -80, y: 100 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 1.4 }}
                layout
                layoutId={heroScreenshots[3].src}
                className="absolute left-8 bottom-12 w-[40%] sm:w-[30%] lg:w-[25%] z-10 hidden lg:block"
              >
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [-1, -2, -1],
                  }}
                  transition={{ 
                    duration: 8, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="relative group cursor-pointer"
                  onClick={() => swapToCenter(3)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      swapToCenter(3);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition" />
                  <div className="relative bg-background border border-border/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="aspect-[16/9] bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                      <div className="relative w-full h-full bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center">
                        <Image src={heroScreenshots[3].src} alt={heroScreenshots[3].alt} fill className="rounded-lg object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Bottom Right - Floating card */}
              <motion.div
                initial={{ opacity: 0, x: 80, y: 100 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 1.6 }}
                layout
                layoutId={heroScreenshots[4].src}
                className="absolute right-8 bottom-8 w-[40%] sm:w-[30%] lg:w-[25%] z-10 hidden lg:block"
              >
                <motion.div
                  animate={{ 
                    y: [0, 10, 0],
                    rotate: [1, 2, 1],
                  }}
                  transition={{ 
                    duration: 9, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="relative group cursor-pointer"
                  onClick={() => swapToCenter(4)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      swapToCenter(4);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition" />
                  <div className="relative bg-background border border-border/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="aspect-[16/9] bg-gradient-to-br from-orange-500/10 to-red-500/10 ">
                      <div className="relative w-full h-full bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center">
                        <Image src={heroScreenshots[4].src} alt={heroScreenshots[4].alt} fill className="rounded-lg object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            </LayoutGroup>
          </div>
        </div>

      </section>

      {/* FEATURES */}
      <section ref={featuresRef} id="features" className="pt-28 pb-24 sm:pt-24 sm:pb-32 relative">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Platform Features
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to simplify club operations, inventory management, and AI-assisted support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 50 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card
                    className="group p-6 h-full border-2 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-2 relative overflow-hidden"
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    <motion.div
                      className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} mb-4 relative z-10`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </motion.div>
                    
                    <h3 className="text-xl font-semibold mb-2 relative z-10">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed relative z-10">{feature.description}</p>
                    
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <MenuTable />

      {/* CTA */}
      <section ref={ctaRef} className="py-14 sm:py-22 relative overflow-hidden">
        <div className="absolute inset-0 " />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={ctaInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 relative"
            whileHover={{ scale: 1.1 }}
          >
            <Zap className="h-8 w-8 text-white" />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          <h2 className="text-4xl sm:text-5xl font-bold mb-4">Start Your Journey</h2>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Whether you're a student, club lead, or faculty member—ClubSync brings
            clarity and organization to every workflow.
          </p>

          {!loading && !user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg" 
                className="text-base px-8 group relative overflow-hidden h-12"
                onClick={() => router.push("/signup")}
              >
                <span className="relative z-10 flex items-center">
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 border-2 hover:border-primary/50 hover:bg-primary/5 h-12"
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
            </motion.div>
          )}
        </motion.div>
      </section>

      </main>
      
    </div>
  );
}
