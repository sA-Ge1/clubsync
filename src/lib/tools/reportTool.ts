import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import PdfPrinter from "pdfmake";

const fonts = {
  Roboto: {
    normal: path.join(process.cwd(), "fonts/Roboto-Regular.ttf"),
    bold: path.join(process.cwd(), "fonts/Roboto-Medium.ttf"),
    italics: path.join(process.cwd(), "fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(process.cwd(), "fonts/Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fonts);


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

type TimePeriod = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

const TIME_PERIODS = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "1y": "Last Year",
  "all": "All Time",
} as const;

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

function getFundTypeLabel(type: number): string {
  const labels = [
    "Administrative",
    "Event",
    "Promotional",
    "Equipment",
    "Training",
    "Misc",
    "Other Expense",
    "College",
    "Sponsors",
    "Workshops",
    "Members Contribution",
    "Services",
    "Other Income",
  ];
  return labels[type] || "Unknown";
}

function formatCurrency(value: number): string {
  return `₹${value}`;
}

async function imageToBase64(publicPath: string): Promise<string> {
  try {
    // Read from public folder
    const imagePath = path.join(process.cwd(), "public", publicPath);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    const mimeType = publicPath.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error reading image:", error);
    return ""; // Return empty string if image not found
  }
}

async function fetchClubData(clubId: string) {
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("club_id, name, description, technical")
    .eq("club_id", clubId)
    .single();

  if (clubError) throw new Error(`Club not found: ${clubError.message}`);

  return club;
}

async function fetchClubFunds(clubId: string, timePeriod: TimePeriod) {
  const { data: fundsData, error: fundsError } = await supabase
    .from("funds")
    .select("fund_id, amount, club_id, is_credit, bill_date, name, description, type, submitted_by")
    .eq("club_id", clubId)
    .eq("is_trashed", false)
    .order("is_credit", { ascending: false })
    .order("bill_date");

  if (fundsError) throw new Error(`Failed to fetch funds: ${fundsError.message}`);

  // Filter by time period
  let filteredFunds = fundsData || [];
  if (timePeriod !== "all") {
    const startDate = getDateRange(timePeriod);
    filteredFunds = filteredFunds.filter(
      (fund: any) => fund.bill_date && new Date(fund.bill_date) >= startDate
    );
  }

  // Fetch submitted_by names
  const fundsWithNames = await Promise.all(
    filteredFunds.map(async (fund: any) => {
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

  return fundsWithNames as Fund[];
}

async function fetchMemberCount(clubId: string) {
  const { count, error } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId);

  if (error) throw new Error(`Failed to fetch member count: ${error.message}`);

  return count || 0;
}

async function generatePDFBuffer(
  club: any,
  funds: Fund[],
  memberCount: number,
  timePeriod: TimePeriod
): Promise<Buffer> {
  const coverImageBase64 = await imageToBase64("report-cover.png");
  const periodLabel = TIME_PERIODS[timePeriod];
  const generatedOn = new Date().toLocaleDateString();

  const borderMargin = 25;
  const headerBlue = "#0B3A63";
  const altRow = "#F5F5F5";

  // Calculate stats
  const totalIncome = funds.filter((f) => f.is_credit).reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalExpenditure = funds.filter((f) => !f.is_credit).reduce((sum, f) => sum + (f.amount || 0), 0);
  const netBalance = totalIncome - totalExpenditure;

  const content: any[] = [];

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
            fontSize: 14,
            bold: true,
          },
          {
            text: club.name || "N/A",
            style: "coverValue",
            fillColor: "#F3F4F6",
            fontSize: 14,
          },
        ],
        [
          {
            text: "DESCRIPTION",
            style: "coverLabel",
            fillColor: "#0B3A63",
            color: "#FFFFFF",
            fontSize: 14,
            bold: true,
          },
          {
            text: club.description || "—",
            style: "coverValue",
            fillColor: "#F3F4F6",
            fontSize: 14,
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

    absolutePosition: { x: 50, y: 360 },
  };

  const coverStatsTable = {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        [
          {
            text: "Members",
            style: "coverHeader",
            fillColor: "#0B3A63",
            color: "#FFFFFF",
          },
          {
            text: "Club Type",
            style: "coverHeader",
            fillColor: "#0B3A63",
            color: "#FFFFFF",
          },
          {
            text: "Time Period",
            style: "coverHeader",
            fillColor: "#0B3A63",
            color: "#FFFFFF",
          },
          {
            text: "Generated On",
            style: "coverHeader",
            fillColor: "#0B3A63",
            color: "#FFFFFF",
          },
        ],
        [
          { text: memberCount.toString(), style: "coverValueCenter", fontSize: 12 },
          {
            text: club.technical ? "Technical" : "Non-Technical",
            style: "coverValueCenter",
            fontSize: 12,
          },
          { text: periodLabel, style: "coverValueCenter", fontSize: 12 },
          { text: generatedOn, style: "coverValueCenter", fontSize: 12 },
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
    {
      text: "Club Funds Details",
      style: "title",
      bold: true,
      alignment: "center",
      margin: [0, 0, 0, 8],
    }
  );

  if (funds.length > 0) {
    const body = [
      [
        { text: "Sl.No", style: "tableHeader" },
        { text: "Date", style: "tableHeader" },
        { text: "Name", style: "tableHeader" },
        { text: "Type", style: "tableHeader" },
        { text: "Category", style: "tableHeader" },
        { text: "Amount", style: "tableHeader" },
        { text: "Submitted By", style: "tableHeader" },
      ],
      ...funds.map((fund, i) => [
        i + 1,
        fund.bill_date ? new Date(fund.bill_date).toLocaleDateString() : "N/A",
        fund.name || "N/A",
        getFundTypeLabel(fund.type),
        fund.is_credit ? "Income" : "Expenditure",
        formatCurrency(fund.amount || 0),
        fund.submitted_by_usn || "-",
      ]),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ["auto", "auto", "*", "auto", "auto", "auto", "*"],
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
    });

    content.push({
      unbreakable: true,
      margin: [0, 20, 0, 0],
      stack: [
        {
          text: "Summary:",
          fontSize: 14,
          bold: true,
          color: "#1F2937",
          margin: [0, 0, 0, 8],
        },

        {
          table: {
            widths: ["22%", "3%", "75%"],
            body: [
              [
                { text: "Total Income", color: "#FFFFFF", fontSize: 12, bold: true },
                { text: ":", color: "#FFFFFF", fontSize: 12, bold: true },
                {
                  text: `₹ ${totalIncome}`,
                  color: "#FFFFFF",
                  fontSize: 12,
                  bold: true,
                },
              ],
              [
                { text: "Total Expenditure", color: "#FFFFFF", fontSize: 12, bold: true },
                { text: ":", color: "#FFFFFF", fontSize: 12, bold: true },
                {
                  text: `₹ ${totalExpenditure}`,
                  color: "#FFFFFF",
                  fontSize: 12,
                  bold: true,
                },
              ],
              [
                { text: "Net Balance", color: "#FFFFFF", fontSize: 12, bold: true },
                { text: ":", color: "#FFFFFF", fontSize: 12, bold: true },
                { text: `₹ ${netBalance}`, color: "#FFFFFF", fontSize: 12, bold: true },
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

  /* ---- FUND DOCUMENTS ---- */
  // Note: Document attachments are skipped in AI-generated reports
  // because pdfToImages is a client-side only function.
  // Fund documents are only included in manually generated reports from the UI.

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
      if (currentPage === 1 && coverImageBase64) {
        return {
          image: coverImageBase64,
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
        alignment: "center",
        verticalAlignment: "middle",
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
      font: 'Roboto',
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

  return new Promise((resolve, reject) => {
  try {

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];

    pdfDoc.on("data", (chunk) => {
      chunks.push(chunk);
    });

    pdfDoc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    pdfDoc.on("error", reject);

    pdfDoc.end();

  } catch (e) {
    reject(e);
  }
});

}

export const reportTool = tool({
  description: `
    Generates a PDF financial report for a specific club.
    
    The report includes:
    - Club information (name, description, type)
    - Member count
    - Detailed funds table (income and expenses)
    - Financial summary (total income, expenditure, net balance)
    - Time period filtering
    
    Note: Fund document attachments are only available in manually generated reports from the UI.
    AI-generated reports focus on financial data and statistics.
    
    Use this when the user asks to generate, create, or download a report for a club.
    
    CRITICAL: After calling this tool, DO NOT output the pdf_data field or create download links.
    The UI will automatically render a download card. Only mention the statistics in your response.
    `,

  inputSchema: z.object({
    club_name: z
      .string()
      .describe("The name of the club to generate the report for (e.g., 'Robotics Club', 'Drama Club')"),
    time_period: z
      .enum(["7d", "30d", "3m", "6m", "1y", "all"])
      .default("all")
      .describe("Time period for the report: 7d, 30d, 3m, 6m, 1y, or all"),
  }),

  execute: async ({ club_name, time_period }) => {
    try {
      // Find club by name
      const { data: clubs, error: clubSearchError } = await supabase
        .from("clubs")
        .select("club_id, name")
        .ilike("name", `%${club_name}%`)
        .limit(5);

      if (clubSearchError) throw new Error(`Failed to search clubs: ${clubSearchError.message}`);

      if (!clubs || clubs.length === 0) {
        return {
          success: false,
          message: `No club found matching "${club_name}". Please check the club name and try again.`,
        };
      }

      if (clubs.length > 1) {
        return {
          success: false,
          message: `Multiple clubs found matching "${club_name}": ${clubs.map((c) => c.name).join(", ")}. Please be more specific.`,
          suggestions: clubs.map((c) => c.name),
        };
      }

      const clubId = clubs[0].club_id;
      const exactClubName = clubs[0].name;

      // Fetch all required data
      const club = await fetchClubData(clubId);
      const funds = await fetchClubFunds(clubId, time_period);
      const memberCount = await fetchMemberCount(clubId);

      // Generate PDF
      const pdfBuffer = await generatePDFBuffer(club, funds, memberCount, time_period);

      // Convert to base64 for transmission
      const base64Pdf = pdfBuffer.toString("base64");

      const periodLabel = TIME_PERIODS[time_period];
      const fileName = `${club.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report-${new Date().toISOString().split("T")[0]}.pdf`;

      return {
        success: true,
        message: `Report generated successfully for ${exactClubName} (${periodLabel}).`,
        club_name: exactClubName,
        time_period: periodLabel,
        member_count: memberCount,
        total_income: funds.filter((f) => f.is_credit).reduce((sum, f) => sum + (f.amount || 0), 0),
        total_expenditure: funds.filter((f) => !f.is_credit).reduce((sum, f) => sum + (f.amount || 0), 0),
        net_balance: funds.filter((f) => f.is_credit).reduce((sum, f) => sum + (f.amount || 0), 0) - funds.filter((f) => !f.is_credit).reduce((sum, f) => sum + (f.amount || 0), 0),
        fund_count: funds.length,
        pdf_data: base64Pdf,
        file_name: fileName,
      };
    } catch (error: any) {
      console.error("Report generation error:", error);
      return {
        success: false,
        message: `Failed to generate report: ${error.message}`,
      };
    }
  },
});
