"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const menuItems = [
  { name: "Home", href: "/", description: "Back To Home Page" },
  { name: "Student", href: "/student", description: "Visit Student Dasboard(for students)" },
  { name: "Clubs", href: "/clubs", description: "Visit All Clubs and View Basic Info" },
  { name: "Inventory", href: "/inventory", description: "Browse Through Inventory present" },
  { name: "Admin", href: "/dashboard", description: "Admin Dashboard For Complete Access" },
  { name: "Login", href: "/login", description: "Login To Your Account" },
  { name: "Sign up", href: "/signup", description: "Create New Account" },
  { name: "Departments", href: "/departments", description: "View Departments And Faculty Members" },
  { name: "Features", href: "/#features", description: "Explore All Features" },
  { name: "Support", href: "/support", description: "Get Help" },
  { name: "Contact", href: "/contact", description: "Get In Touch With Devs" },
];

export default function MenuTable() {
  return (
    <section className="w-full mb-20 flex flex-col justify-center items-center bg-background py-20" id="links">
        <h2 className="text-4xl font-extrabold mb-20 text-center">
          Quick <span className="text-primary">Links</span>
        </h2>
      <div className="max-w-7xl mx-auto px-6 w-full">
        {/* Grid/Table */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
          {menuItems.map((item, i) => (
            <Link key={i} href={item.href}>
              <motion.div
                initial="rest"
                whileHover="hover"
                animate="rest"
                className="group flex items-center justify-between cursor-pointer border-b border-border pb-2"
              >
                <div className="flex flex-col">
                  {/* Name */}
                  <span className="text-sm sm:text-lg lg:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </span>

                  {/* Description (shows on hover) */}
                  <motion.span
                    variants={{
                      rest: { opacity: 0, y: -4, height: 0 },
                      hover: { opacity: 1, y: 0, height: "auto" },
                    }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-muted-foreground overflow-hidden"
                  >
                    {item.description}
                  </motion.span>
                </div>

                {/* Arrow */}
                <motion.div
                  variants={{
                    rest: { opacity: 1, x: -4 },
                    hover: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-primary"
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
