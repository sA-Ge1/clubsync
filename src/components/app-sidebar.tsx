"use client"

import * as React from "react"
import {
  Building2,
  Settings2,
  BarChart3,
  House,
  Database,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useUserInfo } from "@/hooks/useUserInfo"
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import type { TabKey } from '@/components/nav-main'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useSidebar } from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
  const { user } = useUserInfo();
  const [clubs, setClubs] = React.useState<Array<{ club_id: string; name: string }>>([]);
  const [departments, setDepartments] = React.useState<Array<{ dept_id: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const { open } = useSidebar();

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [clubsRes, deptsRes] = await Promise.all([
          supabase.from("clubs").select("club_id, name").order("name"),
          supabase.from("departments").select("dept_id, name").order("name"),
        ]);

        if (clubsRes.data) setClubs(clubsRes.data);
        if (deptsRes.data) setDepartments(deptsRes.data);
      } catch (error) {
        console.error("Error loading sidebar data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTabClick = (tab: TabKey) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const navMain = [
    {
      title: "Manage Data",
      url: "/",
      icon: Database,
      isActive: activeTab === "clubs" || activeTab === "departments" || activeTab === "students" || activeTab === "faculty",
      items: [
        {
          title: "Clubs",
          url: "#",
          tab: "clubs" as TabKey,
        },
        {
          title: "Students",
          url: "#",
          tab: "students" as TabKey,
        },
        {
          title: "Departments",
          url: "#",
          tab: "departments" as TabKey,
        },
        {
          title: "Faculty",
          url: "#",
          tab: "faculty" as TabKey,
        },
      ],
    },
    {
      title: "Club Overview",
      url: "#",
      icon: House,
      isActive: activeTab === "club",
      items: clubs.map((club) => ({
        title: club.name,
        url: `/dashboard?tab=club&clubId=${club.club_id}&name=${club.name}`,
        tab: undefined,
      })),
    },
    {
      title: "Department Overview",
      url: "#",
      icon: Building2,
      isActive: activeTab==="department",
      items: departments.map((dept) => ({
        title: dept.name,
        url: `/dashboard?tab=department&deptId=${dept.dept_id}&name=${dept.name}`,
        tab: undefined,
      })),
    },
    {
      title: "Statistics",
      url: "#",
      icon: BarChart3,
      isActive: false,
      items: [
        {
          title: "Clubs Statistics",
          url: "/dashboard?tab=stats",
          tab: undefined,
        },
        {
          title: "Generate Report",
          url: "/dashboard?tab=report",
          tab: undefined,
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      isActive: false,
      items: [
        {
          title: "General",
          url: "/dashboard?tab=settings",
          tab: undefined,
        },
      ],
    },
  ];

  const userData = user ? {
    name: user.name || "User",
    email: user.email || "",
    avatar: user.avatar || "",
  } : {
    name: "Guest",
    email: "",
    avatar: "",
  };


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex items-center justify-center mt-2">
      {open && (<span className="text-xl font-bold">ClubSync</span>)}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} activeTab={activeTab} onTabClick={handleTabClick} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
