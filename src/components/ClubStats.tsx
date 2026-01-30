"use client"

import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils";
import { Users, TrendingUp, Calendar, ArrowUpCircle, ArrowDownCircle, IndianRupee } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Club {
  club_id: string;
  name: string;
}

interface Fund {
  fund_id: string;
  amount: number;
  club_id: string;
  is_credit: boolean;
  bill_date: string | null;
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

// Time period options
type TimePeriod = "7d" | "30d" | "3m" | "6m" | "1y" | "all"

const TIME_PERIODS = [
  { value: "7d" as TimePeriod, label: "Last 7 Days" },
  { value: "30d" as TimePeriod, label: "Last 30 Days" },
  { value: "3m" as TimePeriod, label: "Last 3 Months" },
  { value: "6m" as TimePeriod, label: "Last 6 Months" },
  { value: "1y" as TimePeriod, label: "Last Year" },
  { value: "all" as TimePeriod, label: "All Time" },
] as const

// Helper function to get date range for time period
function getDateRange(period: TimePeriod): Date {
  const now = new Date()
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case "all":
      return new Date(2000, 0, 1) // Far past date
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

// Chart configuration
const CHART_CONFIG = {
  members: {
    label: "Members",
    color: "#3b82f6", // blue-500
  },
  income: {
    label: "Income",
    color: "#22c55e", // green-500
  },
  expenditure: {
    label: "Expenditure",
    color: "#ef4444", // red-500
  },
} satisfies ChartConfig

export default function ClubStats() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  const [clubs, setClubs] = useState<Club[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all clubs
        const { data: clubsData, error: clubsError } = await supabase
          .from("clubs")
          .select("club_id, name")
          .order("name");

        if (clubsError) throw clubsError;

        // Fetch all memberships
        const { data: membershipsData, error: membershipsError } = await supabase
          .from("memberships")
          .select("member_id, club_id");

        if (membershipsError) throw membershipsError;

        // Fetch all funds
        const { data: fundsData, error: fundsError } = await supabase
          .from("funds")
          .select("fund_id, amount, club_id, is_credit, bill_date")
          .eq("is_trashed", false);

        if (fundsError) throw fundsError;

        setClubs(clubsData || []);
        setMemberships(membershipsData || []);
        setFunds(fundsData || []);
      } catch (error: any) {
        console.error("Error fetching club stats data:", error);
        toast.error("Failed to load club statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter funds by selected time period
  const filteredFunds = useMemo(() => {
    if (timePeriod === "all") return funds
    const startDate = getDateRange(timePeriod)
    return funds.filter(fund => fund.bill_date && new Date(fund.bill_date) >= startDate)
  }, [funds, timePeriod])

  // Process club statistics data
  const clubStatsData = useMemo(() => {
    const statsMap = new Map<string, ClubStatsData>();

    // Initialize all clubs
    clubs.forEach(club => {
      statsMap.set(club.club_id, {
        club_id: club.club_id,
        club_name: club.name,
        member_count: 0,
        total_income: 0,
        total_expenditure: 0,
        net_balance: 0,
      });
    });

    // Count memberships
    memberships.forEach(membership => {
      const stats = statsMap.get(membership.club_id);
      if (stats) {
        stats.member_count += 1;
      }
    });

    // Calculate income and expenditure
    filteredFunds.forEach(fund => {
      const stats = statsMap.get(fund.club_id);
      if (stats) {
        if (fund.is_credit) {
          stats.total_income += fund.amount || 0;
        } else {
          stats.total_expenditure += fund.amount || 0;
        }
      }
    });

    // Calculate net balance
    statsMap.forEach(stats => {
      stats.net_balance = stats.total_income - stats.total_expenditure;
    });

    return Array.from(statsMap.values())
      .sort((a, b) => b.member_count - a.member_count); // Sort by member count
  }, [clubs, memberships, filteredFunds]);

  // Prepare data for member count chart
  const memberCountData = useMemo(() => {
    return clubStatsData
      .map(club => ({
        name: club.club_name.length > 15 ? `${club.club_name.slice(0, 15)}...` : club.club_name,
        fullName: club.club_name,
        members: club.member_count,
      }))
      .sort((a, b) => b.members - a.members)
      .slice(0, 20); // Top 20 clubs
  }, [clubStatsData]);

  // Prepare data for income comparison chart
  const incomeComparisonData = useMemo(() => {
    return clubStatsData
      .filter(club => club.total_income > 0)
      .map(club => ({
        name: club.club_name.length > 15 ? `${club.club_name.slice(0, 15)}...` : club.club_name,
        fullName: club.club_name,
        income: club.total_income,
      }))
      .sort((a, b) => b.income - a.income)
      .slice(0, 20); // Top 20 clubs
  }, [clubStatsData]);

  // Prepare data for expenditure comparison chart
  const expenditureComparisonData = useMemo(() => {
    return clubStatsData
      .filter(club => club.total_expenditure > 0)
      .map(club => ({
        name: club.club_name.length > 15 ? `${club.club_name.slice(0, 15)}...` : club.club_name,
        fullName: club.club_name,
        expenditure: club.total_expenditure,
      }))
      .sort((a, b) => b.expenditure - a.expenditure)
      .slice(0, 20); // Top 20 clubs
  }, [clubStatsData]);

  // Prepare data for combined income/expenditure chart
  const combinedFinancialData = useMemo(() => {
    return clubStatsData
      .filter(club => club.total_income > 0 || club.total_expenditure > 0)
      .map(club => ({
        name: club.club_name.length > 15 ? `${club.club_name.slice(0, 15)}...` : club.club_name,
        fullName: club.club_name,
        income: club.total_income,
        expenditure: club.total_expenditure,
      }))
      .sort((a, b) => (b.income + b.expenditure) - (a.income + a.expenditure))
      .slice(0, 15); // Top 15 clubs
  }, [clubStatsData]);

  // Calculate summary statistics
  const totalMembers = clubStatsData.reduce((sum, club) => sum + club.member_count, 0);
  const totalIncome = clubStatsData.reduce((sum, club) => sum + club.total_income, 0);
  const totalExpenditure = clubStatsData.reduce((sum, club) => sum + club.total_expenditure, 0);
  const totalNetBalance = totalIncome - totalExpenditure;
  const avgMembersPerClub = clubStatsData.length > 0 ? totalMembers / clubStatsData.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <span className="text-muted-foreground">Loading club statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Time Period:</span>
        </div>
        <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
          <SelectTrigger className="w-[180px]">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clubs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              {clubs.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {avgMembersPerClub.toFixed(1)} members/club
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" />
              {totalMembers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5" />
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenditure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5" />
              {formatCurrency(totalExpenditure)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Count Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Count Comparison
          </CardTitle>
          <CardDescription>
            Number of members per club
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberCountData.length > 0 ? (
            <ChartContainer config={CHART_CONFIG} className="h-full w-full p-5 overflow-hidden">
              <BarChart
                accessibilityLayer
                data={memberCountData}
                layout="vertical"
                barSize={24}
                margin={{
                  left: 8,
                  right: 8,
                }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="name"
                  className="text-wrap"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  width={150}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, payload) => {
                        const data = Array.isArray(payload) && payload[0] ? (payload[0] as any).payload : null;
                        return [
                          `${value} members`,
                          data?.fullName || ""
                        ];
                      }}
                    />
                  }
                />
                <Bar dataKey="members" fill="var(--color-members)" radius={2} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No member data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income Comparison
            </CardTitle>
            <CardDescription>
              Total income per club for selected period (Top 20 clubs)
            </CardDescription>
          </CardHeader>

          <CardContent>
            {incomeComparisonData.length > 0 ? (
              <ChartContainer config={CHART_CONFIG} className="h-[320px] max-w-full overflow-hidden">
                <BarChart
                  data={incomeComparisonData}
                  layout="vertical"
                  barSize={24}
                  barCategoryGap="15%"
                  margin={{ left: 8, right: 32 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrencyAxis}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
                      />
                    }
                  />
                  <Bar
                    dataKey="income"
                    fill="var(--color-income)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No income data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenditure Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Expenditure Comparison
            </CardTitle>
            <CardDescription>
              Total expenditure per club for selected period (Top 20 clubs)
            </CardDescription>
          </CardHeader>

          <CardContent>
            {expenditureComparisonData.length > 0 ? (
              <ChartContainer config={CHART_CONFIG} className="h-[320px] max-w-full overflow-hidden">
                <BarChart
                  data={expenditureComparisonData}
                  layout="vertical"
                  barSize={24}
                  barCategoryGap="15%"
                  margin={{ left: 8, right: 32 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrencyAxis}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
                      />
                    }
                  />
                  <Bar
                    dataKey="expenditure"
                    fill="var(--color-expenditure)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expenditure data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Combined Income vs Expenditure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Income vs Expenditure Comparison
          </CardTitle>
          <CardDescription>
            Side-by-side comparison of income and expenditure for top clubs (Top 15 clubs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {combinedFinancialData.length > 0 ? (
            <ChartContainer config={CHART_CONFIG}>
              <BarChart
                accessibilityLayer
                barSize={24}
                data={combinedFinancialData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatCurrencyAxis(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, payload) => {
                        const data = Array.isArray(payload) && payload[0] ? (payload[0] as any).payload : null;
                        return [
                          formatCurrency(Number(value)),
                          data?.fullName || ""
                        ];
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expenditure" fill="var(--color-expenditure)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No financial data available for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

