"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const menuItems = [
  { name: "Home", href: "/", description: "Back to the main page" },
  { name: "Student", href: "/student", description: "Visit student dasboard(for students)" },
  { name: "Club", href: "/club", description: "Visit club dasboard(for clubs)" },
  { name: "Inventory", href: "/inventory", description: "Check out the inventory present" },
  { name: "Sign Up", href: "/signup", description: "Create your account" },
  { name: "Department", href: "/department", description: "Visit club dasboard(for faculty)" },
  { name: "Features", href: "/#features", description: "Explore all features" },
  { name: "Support", href: "/support", description: "Get help" },
  { name: "Contact", href: "/contact", description: "Get in touch with devs" },
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
