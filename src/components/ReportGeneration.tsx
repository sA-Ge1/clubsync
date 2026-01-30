"use client"

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye, FileSpreadsheet, FileDown } from "lucide-react";
import { getFundTypeLabel } from "@/lib/fundTypeStatus";
import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import dynamic from "next/dynamic";



const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
});
interface Club {
  club_id: string;
  name: string;
  description: string;
  technical:boolean;
}
function formatCurrency(value:number):string{
  return `₹${value}`
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
  submitted_by_usn?: string;
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


/* ---------------- SUPABASE HELPERS ---------------- */

async function downloadPdfFromSupabase(filePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase
    .storage
    .from("fund-documents")
    .download(filePath);

  if (error) throw error;
  return await data.arrayBuffer();
}

async function getAllFundDocuments() {
  const { data, error } = await supabase
    .from("fund_documents")
    .select("fund_id, file_name, file_path")
    .neq("is_deleted", true)
    .eq("mime_type", "application/pdf")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}




function groupDocumentsByFund(
  docs: any[],
  validFundIds: Set<string>
) {
  const map = new Map<string, any[]>();

  for (const doc of docs) {
    // 🔒 filter strictly by valid funds
    if (!validFundIds.has(doc.fund_id)) continue;

    if (!map.has(doc.fund_id)) {
      map.set(doc.fund_id, []);
    }

    map.get(doc.fund_id)!.push(doc);
  }

  return map;
}


/* ---------------- IMAGE / PDF HELPERS ---------------- */
function buildDocumentHeader(
  fund: string,
  file: string,
  fund_id: string
) {
  return {
    margin: [0, 0, 0, 8],
    columns: [
      {
        text: `${fund} — ${file}`,
        fontSize: 9,
        bold: true,
        color: "#444",
        alignment: "left",
      },
      {
        text: fund_id,
        fontSize: 9,
        bold:true,
        color: "#666",
        alignment: "right",
      },
    ],
    columnGap: 10,
  };
}




export default function ReportGeneration() {
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  // pdfmake font init (required for browser builds)
  useEffect(() => {
    (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs;
  }, []);

  // Cleanup old blob URLs
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);
  

  useEffect(() => {
    if (!selectedClubId || !clubs?.length) {
      setFileName("");
      return;
    }

    const selectedClub = clubs.find(
      (club) => club.club_id === selectedClubId
    );

    const safeClubName = slugifyFileName(
      selectedClub?.name || "club"
    );

    const reportDate = formatDateForFile();

    setFileName(`${safeClubName}-funds-report-${reportDate}.pdf`);
  }, [selectedClubId, clubs]);


  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [{ data: clubsData, error: clubsError }, { data: membershipsData, error: membershipsError }, { data: fundsData, error: fundsError }] = await Promise.all([
          supabase.from("clubs").select("club_id, name,description,technical").order("name"),
          supabase.from("memberships").select("member_id, club_id"),
          supabase.from("funds").select("fund_id, amount, club_id, is_credit, bill_date, name, description, type, submitted_by").eq("is_trashed", false).order("is_credit",{ascending:false}).order("bill_date",)
        ]);

        if (clubsError) throw clubsError;
        if (membershipsError) throw membershipsError;
        if (fundsError) throw fundsError;

        // Fetch submitted_by names
        const fundsWithNames = await Promise.all(
          (fundsData || []).map(async (fund: any) => {
            if (!fund.submitted_by) return { ...fund, submitted_by_usn: "-" };
            const { data: memberData } = await supabase
              .from("memberships")
              .select("usn")
              .eq("member_id", fund.submitted_by)
              .single();
            
            
            return {
              ...fund,
              submitted_by_usn: memberData?.usn || "-",
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
  const imageToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
  
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  function slugifyFileName(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  
  function formatDateForFile(date = new Date()): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy}`;
  }
  
  // Generate PDF Report
  const generatePDFReport = async () => {
    try {
 
      setGenerating(true);
      const coverImageBase64 = await imageToBase64("/report-cover.png");
      const periodLabel =
        TIME_PERIODS.find((p) => p.value === timePeriod)?.label || "All Time";
      const generatedOn = new Date().toLocaleDateString();

      const borderMargin = 25;
      const headerBlue = "#0B3A63";
      const altRow = "#F5F5F5";

      const content: any[] = [];
      if (!selectedClubId) {
        setGenerating(false);
        toast.error("Select club first!");
        return;
      }

        const club = clubs.find((c) => c.club_id === selectedClubId);
        const stats = clubStatsData.find((s) => s.club_id === selectedClubId);
        const clubFunds = filteredFunds.filter((f) => f.club_id === selectedClubId);

        if (!club || !stats) {
          toast.error("Club not found");
          return;
        }
        const coverInfoTable = {
          table: {
            widths: [120, "*"],
            body: [
              [
                {
                  text: "CLUB NAME",
                  style: "coverLabel",
                  fillColor: "#0B3A63",
                  color: "#FFFFFF",
                  fontSize:14,
                  bold:true,
                },
                {
                  text: club.name || "N/A",
                  style: "coverValue",
                  fillColor: "#F3F4F6",
                  fontSize:14,
                },
              ],
              [
                {
                  text: "DESCRIPTION",
                  style: "coverLabel",
                  fillColor: "#0B3A63",
                  color: "#FFFFFF",
                  fontSize:14,
                  bold:true,
                },
                {
                  text: club.description || "—",
                  style: "coverValue",
                  fillColor: "#F3F4F6",
                  fontSize:14,
                },
              ],
            ],
          },
        
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#000000",
            vLineColor: () => "#000000",
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 10,
            paddingBottom: () => 10,
          },
        
          // you will tweak this
          absolutePosition: { x: 50, y: 360 },
        };
        const coverStatsTable = {
          table: {
            widths: ["25%", "25%", "25%", "25%"],
            body: [
              [
                { text: "Members", style: "coverHeader", fillColor: "#0B3A63",color: "#FFFFFF", },
                { text: "Club Type", style: "coverHeader", fillColor: "#0B3A63",color: "#FFFFFF", },
                { text: "Time Period", style: "coverHeader", fillColor: "#0B3A63",color: "#FFFFFF", },
                { text: "Generated On", style: "coverHeader", fillColor: "#0B3A63",color: "#FFFFFF", },
              ],
              [
                { text: stats.member_count.toString(), style: "coverValueCenter",fontSize:12 },
                { text: club.technical ? "Technical" : "Non-Technical", style: "coverValueCenter",fontSize:12 },
                { text: periodLabel, style: "coverValueCenter",fontSize:12 },
                { text: generatedOn, style: "coverValueCenter", fontSize:12 },
              ],
            ],
          },
          
        
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => "#000000",
            vLineColor: () => "#000000",
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 10,
            paddingBottom: () => 10,
          },
        
          absolutePosition: { x: 50, y: 550 },
        };
                
        content.push(
          // PAGE 1 — cover image + table
          coverInfoTable,
          coverStatsTable,
          { text: "", pageBreak: "after" },
        
          // PAGE 2+
          { text: "Club Funds Details", style: "title", bold:true,alignment: "center", margin: [0, 0, 0, 8] },
      );
        
        
        

        if (clubFunds.length > 0) {
          const body = [
            [
              { text: "Sl.No",style: "tableHeader" },
              { text: "Date", style: "tableHeader" },
              { text: "Name", style: "tableHeader" },
              { text: "Type", style: "tableHeader" },
              { text: "Category", style: "tableHeader" },
              { text: "Amount", style: "tableHeader" },
              { text: "Submitted By", style: "tableHeader" },
            ],
            ...clubFunds.map((fund,i) => [
              i+1,
              fund.bill_date ? new Date(fund.bill_date).toLocaleDateString() : "N/A",
              fund.name || "N/A",
              getFundTypeLabel(fund.type),
              fund.is_credit ? "Income" : "Expenditure",
              formatCurrency(fund.amount || 0),
              fund.submitted_by_usn || "-",
            ]),
          ];

          content.push(
            {
              table: {
                headerRows: 1,
                widths: ["auto","auto", "*", "auto", "auto", "auto", "*"],
                body,
              },
              layout: {
                fillColor: (rowIndex: number) => {
                  if (rowIndex === 0) return headerBlue;
                  return rowIndex % 2 === 0 ? altRow : null;
                },
                hLineColor: () => "#DDDDDD",
                vLineColor: () => "#DDDDDD",
                paddingLeft: () => 4,
                paddingRight: () => 4,
                paddingTop: () => 4,
                paddingBottom: () => 4,
              },
              fontSize: 8,
            }
              
          );
          content.push({
            unbreakable: true, 
            margin: [0, 20, 0, 0],
            stack: [
              {
                text: "Summary:",
                fontSize: 14,
                bold: true,
                color: "#1F2937",
                margin: [0, 0, 0, 8], // space below title
              },
          
              {
                table: {
                  widths: ["22%", "3%", "75%"],
                  body: [
                    [
                      { text: "Total Income", color: "#FFFFFF", fontSize: 12,bold:true },
                      { text: ":", color: "#FFFFFF", fontSize: 12,bold:true },
                      { text: `₹ ${stats.total_income}`, color: "#FFFFFF", fontSize: 12,bold:true },
                    ],
                    [
                      { text: "Total Expenditure", color: "#FFFFFF", fontSize: 12,bold:true },
                      { text: ":", color: "#FFFFFF", fontSize: 12,bold:true },
                      { text: `₹ ${stats.total_expenditure}`, color: "#FFFFFF", fontSize: 12,bold:true },
                    ],
                    [
                      { text: "Net Balance", color: "#FFFFFF", fontSize: 12, bold: true },
                      { text: ":", color: "#FFFFFF", fontSize: 12, bold: true },
                      { text: `₹ ${stats.net_balance}`, color: "#FFFFFF", fontSize: 12, bold: true },
                    ],
                  ],
                },
                layout: {
                  fillColor: () => "#0B3A63",
                  hLineWidth: () => 2,
                  vLineWidth: () => 2,
                  hLineColor: () => "#0B3A63",
                  vLineColor: () => "#0B3A63",
                  paddingLeft: () => 6,
                  paddingRight: () => 6,
                  paddingTop: () => 10,
                  paddingBottom: () => 10,
                },
              },
            ],
          });
          

        }
      


          /* ---- FETCH ALL DOCUMENT METADATA ONCE ---- */
          const allowedFundIds = new Set(
            clubFunds.map(f => f.fund_id)
          );
          
      const allDocs = await getAllFundDocuments();
      const docsByFund = groupDocumentsByFund(allDocs,allowedFundIds);

      /* ---- FUND DOCUMENTS ---- */
      for (const fund of clubFunds) {
        const docsMeta = docsByFund.get(fund.fund_id);
        if (!docsMeta?.length) continue;

        const docsWithImages = [];

        for (const doc of docsMeta) {
          try {
            const buffer = await downloadPdfFromSupabase(doc.file_path);
            const { pdfToImages } = await import(
              "@/lib/pdfToImages.client"
            );
            const pages = await pdfToImages(buffer);

            docsWithImages.push({
              file_name: doc.file_name,
              pages,
            });
          } catch (err) {
            console.error("Skipping document:", doc.file_name, err);
          }
        }

        const hasAtLeastOnePage = docsWithImages.some(
          d => d.pages && d.pages.length > 0
        );
        
        if (hasAtLeastOnePage) {
          content.push({ text: "", pageBreak: "before" });
        
          for (const doc of docsWithImages) {
            for (let i = 0; i < doc.pages.length; i++) {
              const img = doc.pages[i];
              const isLastPage =
                doc === docsWithImages[docsWithImages.length - 1] &&
                i === doc.pages.length - 1;
        
              content.push({
                unbreakable: true,
                stack: [
                  
                  buildDocumentHeader(
                    fund.name || "Unnamed Fund",
                    doc.file_name,
                    fund.fund_id
                  ),
                  { image: img, width: 500 },
                ],
                ...(isLastPage ? {} : { pageBreak: "after" }),
              });
            }
          }
        }
        
        
      }

      const docDefinition: any = {
        pageSize: "A4",
        
        // MUST respect border
        pageMargins: [
          borderMargin + 15, // left
          borderMargin + 25, // top
          borderMargin + 15, // right
          borderMargin + 25, // bottom
        ],
      
        background: (currentPage: number, pageSize: any) => {
          // PAGE 1 → cover image
          if (currentPage === 1) {
            return {
              image: coverImageBase64, // <-- your converted base64
              width: pageSize.width,
              height: pageSize.height,
            };
          }
        
          // PAGE 2+ → existing border
          return {
            canvas: [
              {
                type: "rect",
                x: borderMargin,
                y: borderMargin,
                w: pageSize.width - borderMargin * 2,
                h: pageSize.height - borderMargin * 2,
                lineWidth: 1.5,
                lineColor: "#000000",
              },
            ],
          };
        },
        
        
        content,
      
        footer: (currentPage: number, pageCount: number) => {
          // ❌ No footer on cover page
          if (currentPage === 1) {
            return "";
          }
        
          // ✅ Footer for page 2+
          return {
            columns: [
              { text: "", width: "*" },
              {
                text: `Page ${currentPage - 1} of ${pageCount - 1}`,
                style: "footer",
                alignment: "right",
              },
            ],
            margin: [0, 10, 30, 0],
          };
        },
        
      
        styles: {
          title: {
            fontSize: 20,
            bold: true,
            color: "#1F2937",
            margin: [0, 0, 0, 10],
          },
          coverHeader: {
            fontSize: 10,
            bold: true,
            alignment: "center",        // horizontal center
            verticalAlignment: "middle" // vertical center
          },
          
          coverValueCenter: {
            fontSize: 10,
            alignment: "center",
            verticalAlignment: "middle",
          },
          meta: {
            fontSize: 10,
            color: "#555555",
          },
      
          sectionHeader: {
            fontSize: 14,
            bold: true,
            color: "#111827",
            margin: [0, 15, 0, 6],
          },
      
          statLabel: {
            fontSize: 10,
            bold: true,
            color: "#374151",
          },
      
          statValue: {
            fontSize: 10,
          },
      
          tableHeader: {
            bold: true,
            fontSize: 9,
            color: "#FFFFFF",
            fillColor: headerBlue,
          },
      
          footer: {
            fontSize: 9,
            color: "#6B7280",
          },
        },
      
        defaultStyle: {
          fontSize: 10,
          lineHeight: 1.3,
        },
        reportInfoLabel: {
          fontSize: 10,
          bold: true,
          color: "#374151",
        },
        
        reportInfoValue: {
          fontSize: 10,
          color: "#111827",
        },
        
      };
      

      const pdfBlob: Blob = await new Promise((resolve, reject) => {
        try {
          pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob));
        } catch (e) {
          setGenerating(false);
          reject(e);
        }
      });

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      toast.success("PDF report generated successfully");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setGenerating(false);
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
    link.download = fileName;
  
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

      const exportData = fundsToExport.map((fund,i) => ({
        "Sl.No":i+1,
        "Fund ID": fund.fund_id,
        "Club Name": clubs.find((c) => c.club_id === fund.club_id)?.name || "Unknown",
        "Date": fund.bill_date ? new Date(fund.bill_date).toLocaleDateString() : "N/A",
        "Name": fund.name || "N/A",
        "Description": fund.description || "N/A",
        "Type": getFundTypeLabel(fund.type),
        "Category": fund.is_credit ? "Income" : "Expenditure",
        "Amount": fund.amount || 0,
        "Submitted By": fund.submitted_by_usn || "Unknown",
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
                <label className="text-sm font-medium">Select Club</label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {clubs.map((club) => (
                      <SelectItem key={club.club_id} value={club.club_id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            <Button onClick={generatePDFReport} disabled={generating ||!selectedClubId}>
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
            <div className="space-x-5 flex items-center ">
              <label className="text-sm font-medium">Download All Funds:</label>
              <Button variant="outline" onClick={() => downloadFundsData()} disabled={generating} className="w-auto">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download
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
          <PdfViewer file={pdfUrl} name={fileName} />;
          </CardContent>
        </Card>
      )}
    </div>
  );
}

