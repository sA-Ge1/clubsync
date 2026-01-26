"use client"

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye, FileSpreadsheet, FileDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getFundTypeLabel } from "@/lib/fundTypeStatus";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Club {
  club_id: string;
  name: string;
}

interface Fund {
  fund_id: string;
  amount: number;
  club_id: string;
  is_credit: boolean;
  type: number;
  bill_date: string | null;
  name: string | null;
  description: string | null;
  submitted_by: string | null;
  submitted_by_name?: string;
}

interface Membership {
  member_id: string;
  club_id: string;
}

interface ClubStatsData {
  club_id: string;
  club_name: string;
  member_count: number;
  total_income: number;
  total_expenditure: number;
  net_balance: number;
}

type ReportType = "individual" | "overall";
type TimePeriod = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

const TIME_PERIODS = [
  { value: "7d" as TimePeriod, label: "Last 7 Days" },
  { value: "30d" as TimePeriod, label: "Last 30 Days" },
  { value: "3m" as TimePeriod, label: "Last 3 Months" },
  { value: "6m" as TimePeriod, label: "Last 6 Months" },
  { value: "1y" as TimePeriod, label: "Last Year" },
  { value: "all" as TimePeriod, label: "All Time" },
] as const;

function getDateRange(period: TimePeriod): Date {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "all":
      return new Date(2000, 0, 1);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export default function ReportGeneration() {
  const [reportType, setReportType] = useState<ReportType>("overall");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [{ data: clubsData, error: clubsError }, { data: membershipsData, error: membershipsError }, { data: fundsData, error: fundsError }] = await Promise.all([
          supabase.from("clubs").select("club_id, name").order("name"),
          supabase.from("memberships").select("member_id, club_id"),
          supabase.from("funds").select("fund_id, amount, club_id, is_credit, bill_date, name, description, type, submitted_by").eq("is_trashed", false),
        ]);

        if (clubsError) throw clubsError;
        if (membershipsError) throw membershipsError;
        if (fundsError) throw fundsError;

        // Fetch submitted_by names
        const fundsWithNames = await Promise.all(
          (fundsData || []).map(async (fund: any) => {
            if (!fund.submitted_by) return { ...fund, submitted_by_name: "Unknown" };
            const { data: memberData } = await supabase
              .from("memberships")
              .select("usn, students:usn(name)")
              .eq("member_id", fund.submitted_by)
              .single();
            
            // Handle students relationship - it could be an object or array
            const studentData = memberData?.students;
            const studentName = Array.isArray(studentData) 
              ? studentData[0]?.name 
              : (studentData as any)?.name;
            
            return {
              ...fund,
              submitted_by_name: studentName || memberData?.usn || "Unknown",
            };
          })
        );

        setClubs(clubsData || []);
        setMemberships(membershipsData || []);
        setFunds(fundsWithNames as Fund[]);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter funds by time period
  const filteredFunds = useMemo(() => {
    if (timePeriod === "all") return funds;
    const startDate = getDateRange(timePeriod);
    return funds.filter((fund) => fund.bill_date && new Date(fund.bill_date) >= startDate);
  }, [funds, timePeriod]);

  // Process club statistics
  const clubStatsData = useMemo(() => {
    const statsMap = new Map<string, ClubStatsData>();

    clubs.forEach((club) => {
      statsMap.set(club.club_id, {
        club_id: club.club_id,
        club_name: club.name,
        member_count: 0,
        total_income: 0,
        total_expenditure: 0,
        net_balance: 0,
      });
    });

    memberships.forEach((membership) => {
      const stats = statsMap.get(membership.club_id);
      if (stats) stats.member_count += 1;
    });

    filteredFunds.forEach((fund) => {
      const stats = statsMap.get(fund.club_id);
      if (stats) {
        if (fund.is_credit) {
          stats.total_income += fund.amount || 0;
        } else {
          stats.total_expenditure += fund.amount || 0;
        }
      }
    });

    statsMap.forEach((stats) => {
      stats.net_balance = stats.total_income - stats.total_expenditure;
    });

    return Array.from(statsMap.values());
  }, [clubs, memberships, filteredFunds]);

  // Generate PDF Report
  const generatePDFReport = async () => {
    try {
      setGenerating(true);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Club Statistics Report", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const periodLabel = TIME_PERIODS.find((p) => p.value === timePeriod)?.label || "All Time";
      doc.text(`Period: ${periodLabel}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      if (reportType === "individual" && selectedClubId) {
        const club = clubs.find((c) => c.club_id === selectedClubId);
        const stats = clubStatsData.find((s) => s.club_id === selectedClubId);
        const clubFunds = filteredFunds.filter((f) => f.club_id === selectedClubId);

        if (!club || !stats) {
          toast.error("Club not found");
          return;
        }

        // Club Information
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`Club: ${club.name}`, 14, yPos);
        yPos += 10;

        // Summary Statistics
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Members: ${stats.member_count}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Income: ${formatCurrency(stats.total_income)}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Expenditure: ${formatCurrency(stats.total_expenditure)}`, 14, yPos);
        yPos += 7;
        doc.text(`Net Balance: ${formatCurrency(stats.net_balance)}`, 14, yPos);
        yPos += 15;

        // Funds Table
        if (clubFunds.length > 0) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Funds Details", 14, yPos);
          yPos += 10;

          const tableData = clubFunds.map((fund) => [
            fund.bill_date ? new Date(fund.bill_date).toLocaleDateString() : "N/A",
            fund.name || "N/A",
            getFundTypeLabel(fund.type),
            fund.is_credit ? "Income" : "Expenditure",
            formatCurrency(fund.amount || 0),
            fund.submitted_by_name || "Unknown",
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [["Date", "Name", "Type", "Category", "Amount", "Submitted By"]],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [245, 245, 245] },
          });
        }
      } else {
        // Overall Report
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Overall Statistics", 14, yPos);
        yPos += 10;

        const totalClubs = clubs.length;
        const totalMembers = clubStatsData.reduce((sum, s) => sum + s.member_count, 0);
        const totalIncome = clubStatsData.reduce((sum, s) => sum + s.total_income, 0);
        const totalExpenditure = clubStatsData.reduce((sum, s) => sum + s.total_expenditure, 0);
        const totalNetBalance = totalIncome - totalExpenditure;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Clubs: ${totalClubs}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Members: ${totalMembers}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Expenditure: ${formatCurrency(totalExpenditure)}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Net Balance: ${formatCurrency(totalNetBalance)}`, 14, yPos);
        yPos += 15;

        // Club Statistics Table
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Club-wise Statistics", 14, yPos);
        yPos += 10;

        const sortedStats = [...clubStatsData].sort((a, b) => b.member_count - a.member_count);
        const tableData = sortedStats.map((stats) => [
          stats.club_name,
          stats.member_count.toString(),
          formatCurrency(stats.total_income),
          formatCurrency(stats.total_expenditure),
          formatCurrency(stats.net_balance),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Club Name", "Members", "Income", "Expenditure", "Net Balance"]],
          body: tableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
      }

      // Generate PDF blob and create URL
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      toast.success("PDF report generated successfully");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setGenerating(false);
    }
  };

  // Download PDF
  const downloadPDF = () => {
    if (!pdfUrl) {
      toast.error("Please generate a report first");
      return;
    }
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `club-report-${reportType === "individual" ? selectedClubId : "overall"}-${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PDF downloaded successfully");
  };

  // Download Funds Data (Excel)
  const downloadFundsData = async (clubId?: string) => {
    try {
      setGenerating(true);
      let fundsToExport = filteredFunds;

      if (clubId) {
        fundsToExport = filteredFunds.filter((f) => f.club_id === clubId);
        const club = clubs.find((c) => c.club_id === clubId);
        if (!club) {
          toast.error("Club not found");
          return;
        }
      }

      const exportData = fundsToExport.map((fund) => ({
        "Fund ID": fund.fund_id,
        "Club ID": fund.club_id,
        "Club Name": clubs.find((c) => c.club_id === fund.club_id)?.name || "Unknown",
        "Date": fund.bill_date ? new Date(fund.bill_date).toLocaleDateString() : "N/A",
        "Name": fund.name || "N/A",
        "Description": fund.description || "N/A",
        "Type": getFundTypeLabel(fund.type),
        "Category": fund.is_credit ? "Income" : "Expenditure",
        "Amount": fund.amount || 0,
        "Submitted By": fund.submitted_by_name || "Unknown",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      const fileName = clubId
        ? `funds-${clubs.find((c) => c.club_id === clubId)?.name || clubId}-${new Date().toISOString().split("T")[0]}.xlsx`
        : `all-funds-${new Date().toISOString().split("T")[0]}.xlsx`;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Funds");
      XLSX.writeFile(workbook, fileName);
      toast.success("Funds data downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading funds:", error);
      toast.error("Failed to download funds data");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <span className="text-muted-foreground">Loading report data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Report Generation</h1>
        <p className="text-muted-foreground">Generate and download comprehensive reports for clubs and funds.</p>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Configure your report settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Report</SelectItem>
                  <SelectItem value="individual">Individual Club Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "individual" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Club</label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.club_id} value={club.club_id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={generatePDFReport} disabled={generating || (reportType === "individual" && !selectedClubId)}>
              <FileText className="mr-2 h-4 w-4" />
              {generating ? "Generating..." : "Generate PDF Report"}
            </Button>
            {pdfUrl && (
              <>
                <Button variant="outline" onClick={() => window.open(pdfUrl, "_blank")}>
                  <Eye className="mr-2 h-4 w-4" />
                  View PDF
                </Button>
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Funds Data Download */}
      <Card>
        <CardHeader>
          <CardTitle>Download Funds Data</CardTitle>
          <CardDescription>Download funds data as Excel files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Download All Funds</label>
              <Button variant="outline" onClick={() => downloadFundsData()} disabled={generating} className="w-full">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download All Funds Data
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Download Individual Club Funds</label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.club_id} value={club.club_id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => downloadFundsData(selectedClubId)}
                disabled={generating || !selectedClubId}
                className="w-full"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download Club Funds
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer */}
      {pdfUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
            <CardDescription>Preview the generated PDF report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <iframe src={pdfUrl} className="w-full h-[600px]" title="PDF Preview" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

