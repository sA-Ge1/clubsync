"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";
import { useUserInfo } from "@/hooks/useUserInfo";
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ClubManagement } from "@/components/ClubManagement";
import { DepartmentPrivate } from "@/components/DepartmentPrivate";
import { TabKey } from "@/components/nav-main";
import { FacultyRender } from "@/components/dashboardComps/FacultyRender";
import { StudentRender } from "@/components/dashboardComps/StudentRender";
import { ClubsRender } from "@/components/dashboardComps/ClubsRender";
import { DepartmentRender } from "@/components/dashboardComps/DepartmentRender";

interface Club {
  club_id: string;
  name: string;
  description: string | null;
  email: string | null;
  technical: boolean | null;
  faculty_id: string | null;
}

interface Department {
  dept_id: string;
  name: string;
  description: string | null;
  hod: string | null;
}

interface Student {
  usn: string;
  name: string;
  email: string;
  semester: number | null;
  dept_id: string | null;
}

interface Faculty {
  faculty_id: string;
  name: string;
  email: string | null;
  dept_id: string | null;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUserInfo();
  
  const [activeTab, setActiveTab] = useState<TabKey>("clubs");
  const [clubId, setClubId] = useState<string | null>(null);
  const [deptId,setDeptId] = useState<string | null>(null);
  const [name,setName] = useState<string>("");
  // Sync activeTab with URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const clubIdParam = searchParams.get("clubId");
    const deptIdParam = searchParams.get("deptId");
    const nameParam = searchParams.get("name")

    if (tabParam && ["clubs", "departments", "students", "faculty", "club","department","settings","stats","report"].includes(tabParam)) {
      setActiveTab(tabParam as TabKey);
    }
    setName(nameParam||"");
    setDeptId(deptIdParam);
    setClubId(clubIdParam);
  }, [searchParams]);
  
  // Update URL when tab changes
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    router.push(`/dashboard?tab=${tab}`, { scroll: false });
  };

  // Get dynamic title and description based on active tab
  const getTabInfo = (tab: TabKey) => {
    switch (tab) {
      case "clubs":
        return {
          title: "Clubs Management",
          description: "Manage clubs, add new clubs, update club information, and handle club-related operations.",
          breadcrumb: "Manage Clubs"
        };
      case "departments":
        return {
          title: "Departments Management",
          description: "Manage departments, add new departments, update department information, and assign HODs.",
          breadcrumb: "Manage Departments"
        };
      case "students":
        return {
          title: "Students Management",
          description: "Manage student records, add new students, update student information, and handle student data.",
          breadcrumb: "Manage Students"
        };
      case "faculty":
        return {
          title: "Faculty Management",
          description: "Manage faculty members, add new faculty, update faculty information, and assign departments.",
          breadcrumb: "Manage Faculty"
        };
      case "club":
        return {
          title: "Club Overview",
          description: "Manage club members, inventory, fund requests, and finances.",
          breadcrumb: name
        };
      case "department":
        return {
          title: "Department Management",
          description: "Manage department faculty, inventory requests, and info.",
          breadcrumb: name
        };
      case "stats":
        return {
          title: "Club Statistics",
          description: "Overview of club performance, activity, and key metrics.",
          breadcrumb: "Statistics",
        };
      
      case "report":
        return {
          title: "Report Generation",
          description: "Generate, view, and download detailed reports.",
          breadcrumb: "Reports",
        };
      
      case "settings":
        return {
          title: "Settings",
          description: "Manage preferences, configuration, and access controls.",
          breadcrumb: "Settings",
        };
        
      default:
        return {
          title: "Admin Dashboard",
          description: "Manage clubs, departments, students, and faculty.",
          breadcrumb: "Dashboard"
        };
    }
  };

  const tabInfo = getTabInfo(activeTab);
  
  // Download functions
  const downloadClubs = () => {
    const worksheet = XLSX.utils.json_to_sheet(clubs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clubs");
    XLSX.writeFile(workbook, `clubs_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Clubs data downloaded successfully");
  };

  const downloadDepartments = () => {
    const worksheet = XLSX.utils.json_to_sheet(departments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Departments");
    XLSX.writeFile(workbook, `departments_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Departments data downloaded successfully");
  };

  const downloadStudents = () => {
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, `students_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Students data downloaded successfully");
  };

  const downloadFaculty = () => {
    const worksheet = XLSX.utils.json_to_sheet(faculty);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Faculty");
    XLSX.writeFile(workbook, `faculty_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Faculty data downloaded successfully");
  };

  const [clubs, setClubs] = useState<Club[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      toast.error("Please login first");
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      toast.error("Admins only");
      router.push("/");
      return;
    }
    void loadAll();
  }, [loading, user, isAdmin]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      await Promise.all([loadClubs(), loadDepartments(), loadStudents(), loadFaculty()]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadClubs = async (): Promise<void> => {
    const { data, error } = await supabase.from("clubs").select("*").order("name");
    if (error) {
      toast.error(error.message);
      return;
    }
    setClubs(data || []);
  };

  const loadDepartments = async (): Promise<void> => {
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (error) {
      toast.error(error.message);
      return;
    }
    setDepartments(data || []);
  };

  const loadStudents = async (): Promise<void> => {
    const { data, error } = await supabase.from("students").select("*").order("usn");
    if (error) {
      toast.error(error.message);
      return;
    }
    setStudents(data || []);
  };

  const loadFaculty = async (): Promise<void> => {
    const { data, error } = await supabase.from("faculty").select("*").order("faculty_id");
    if (error) {
      toast.error(error.message);
      return;
    }
    setFaculty(data || []);
  };

  const renderClubs = () => (
    <ClubsRender
      clubs={clubs}
      loadingData={loadingData}
      onReload={loadClubs}
      onDownload={downloadClubs}
      title={tabInfo.title}
      description={tabInfo.description}
    />
  );

  const renderDepartments = () => (
    <DepartmentRender
      departments={departments}
      loadingData={loadingData}
      onReload={loadDepartments}
      onDownload={downloadDepartments}
      title={tabInfo.title}
      description={tabInfo.description}
    />
  );

  const renderStudents = () => (
    <StudentRender
      students={students}
      departments={departments}
      loadingData={loadingData}
      onReload={loadStudents}
      onDownload={downloadStudents}
      title={tabInfo.title}
      description={tabInfo.description}
    />
  );

  const renderFaculty = () => (
    <FacultyRender
      faculty={faculty}
      departments={departments}
      loadingData={loadingData}
      onReload={loadFaculty}
      onDownload={downloadFaculty}
      title={tabInfo.title}
      description={tabInfo.description}
    />
  );

  if (loading || loadingData) {
    return (
      <SidebarProvider>
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Admin
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{tabInfo.breadcrumb}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabKey)}>
            <TabsContent value="clubs">{renderClubs()}</TabsContent>
            <TabsContent value="departments">{renderDepartments()}</TabsContent>
            <TabsContent value="students">{renderStudents()}</TabsContent>
            <TabsContent value="faculty">{renderFaculty()}</TabsContent>
            <TabsContent value="club">
              {clubId ? <ClubManagement key={clubId} clubId={clubId} /> : <div>Please select a club to manage.</div>}
            </TabsContent>
            <TabsContent value="department">
              {deptId ? <DepartmentPrivate key={deptId} deptId={deptId} /> : <div>Please select a department to manage.</div>}
            </TabsContent>
            <TabsContent value="stats">{renderFaculty()}</TabsContent>
            <TabsContent value="report">{renderFaculty()}</TabsContent>
            <TabsContent value="settings">{renderFaculty()}</TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <SidebarProvider>
        <AppSidebar activeTab="clubs" onTabChange={() => {}} />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </SidebarInset>
      </SidebarProvider>
    }>
      <DashboardContent />
    </Suspense>
  );
}
