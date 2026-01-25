"use client"

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
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
import { getFundTypeLabel, isIncome, isExpenditure } from "@/lib/fundTypeStatus";
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Fund {
  fund_id: string;
  amount: number;
  description: string | null;
  club_id: string;
  is_credit: boolean;
  type: number;
  bill_date: string | null;
  name: string | null;
  submitted_by: string | null;
  is_trashed: boolean;
  submitted_by_name?: string;
}

interface FundStatisticsProps {
  funds: Fund[];
}

// Chart configurations with proper green/red color scheme
const CHART_CONFIG = {
  income: {
    label: "Income",
    color: "#22c55e", // green-500
  },
  expenditure: {
    label: "Expenditure",
    color: "#ef4444", // red-500
  },
} satisfies ChartConfig

// Extended chart config for detailed breakdowns
const DETAILED_CHART_CONFIG = {
  ...CHART_CONFIG,
  administrative: {
    label: "Administrative",
    color: "#3b82f6",
  },
  event: {
    label: "Event",
    color: "#8b5cf6",
  },
  sponsorship: {
    label: "Sponsorship",
    color: "#ec4899",
  },
  membership: {
    label: "Membership",
    color: "#f59e0b",
  },
  other: {
    label: "Other",
    color: "#64748b",
  },
} satisfies ChartConfig

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



export default function FundStatistics({ funds }: FundStatisticsProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  const truncateLabel = (value: any, max = 18) => {
    const s = String(value ?? "");
    return s.length > max ? `${s.slice(0, max)}…` : s;
  };

  // Filter funds by selected time period
  const filteredFunds = useMemo(() => {
    if (timePeriod === "all") return funds
    const startDate = getDateRange(timePeriod)
    return funds.filter(fund => fund.bill_date && new Date(fund.bill_date) >= startDate)
  }, [funds, timePeriod])

  // Process data for time series (monthly income vs expenditure)
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; expenditure: number; month: string }>();

    filteredFunds.forEach((fund) => {
      if (!fund.bill_date) return;

      const date = new Date(fund.bill_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expenditure: 0, month: monthLabel });
      }

      const entry = monthlyMap.get(monthKey)!;
      if (fund.is_credit) {
        entry.income += fund.amount || 0;
      } else {
        entry.expenditure += fund.amount || 0;
      }
    });

    // Sort by month key (YYYY-MM format) for proper chronological order
    return Array.from(monthlyMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, value]) => value);
  }, [filteredFunds]);

  // Process data for fund type breakdown
  const fundTypeData = useMemo(() => {
    const typeMap = new Map<string, { name: string; income: number; expenditure: number }>();

    filteredFunds.forEach((fund) => {
      const typeLabel = getFundTypeLabel(fund.type);
      if (!typeMap.has(typeLabel)) {
        typeMap.set(typeLabel, { name: typeLabel, income: 0, expenditure: 0 });
      }

      const entry = typeMap.get(typeLabel)!;
      if (fund.is_credit) {
        entry.income += fund.amount || 0;
      } else {
        entry.expenditure += fund.amount || 0;
      }
    });

    return Array.from(typeMap.values())
      .filter((entry) => entry.income > 0 || entry.expenditure > 0)
      .sort((a, b) => (b.income + b.expenditure) - (a.income + a.expenditure));
  }, [filteredFunds]);

  // Process data for pie chart (income vs expenditure)
  const incomeExpenditurePie = useMemo(() => {
    const totalIncome = filteredFunds
      .filter((f) => f.is_credit)
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalExpenditure = filteredFunds
      .filter((f) => !f.is_credit)
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    return [
      { name: "Income", value: totalIncome },
      { name: "Expenditure", value: totalExpenditure },
    ];
  }, [filteredFunds]);

  // Process data for income types pie chart
  const incomeTypesData = useMemo(() => {
    const typeMap = new Map<string, number>();

    filteredFunds
      .filter((f) => f.is_credit && isIncome(f.type))
      .forEach((fund) => {
        const typeLabel = getFundTypeLabel(fund.type);
        typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + (fund.amount || 0));
      });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredFunds]);

  // Process data for expenditure types pie chart
  const expenditureTypesData = useMemo(() => {
    const typeMap = new Map<string, number>();

    filteredFunds
      .filter((f) => !f.is_credit && isExpenditure(f.type))
      .forEach((fund) => {
        const typeLabel = getFundTypeLabel(fund.type);
        typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + (fund.amount || 0));
      });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredFunds]);

  // Process data for daily trends (last 30 days)
  const dailyTrendsData = useMemo(() => {
    const dailyMap = new Map<string, { income: number; expenditure: number; date: string }>();
    const now = new Date();

    // Create entries for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(dateKey, { income: 0, expenditure: 0, date: dateLabel });
    }

    // Fill in actual data
    filteredFunds.forEach((fund) => {
      if (!fund.bill_date) return;
      const fundDate = new Date(fund.bill_date);
      const dateKey = fundDate.toISOString().split('T')[0];

      if (dailyMap.has(dateKey)) {
        const entry = dailyMap.get(dateKey)!;
        if (fund.is_credit) {
          entry.income += fund.amount || 0;
        } else {
          entry.expenditure += fund.amount || 0;
        }
      }
    });

    return Array.from(dailyMap.values());
  }, [filteredFunds]);

  // Calculate summary statistics
  const totalIncome = filteredFunds
    .filter((f) => f.is_credit)
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalExpenditure = filteredFunds
    .filter((f) => !f.is_credit)
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const netBalance = totalIncome - totalExpenditure;
  const transactionCount = filteredFunds.length;
  const avgTransactionAmount = transactionCount > 0
    ? (totalIncome + totalExpenditure) / transactionCount
    : 0;


  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center justify-between">
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center gap-2 ${
                netBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {netBalance >= 0 ? (
                <ArrowUpCircle className="h-5 w-5" />
              ) : (
                <ArrowDownCircle className="h-5 w-5" />
              )}
              {formatCurrency(Math.abs(netBalance))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(avgTransactionAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expenditure Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Financial Trends
          </CardTitle>
          <CardDescription>
            {timePeriod === "7d" ? "Daily trends for the last 7 days" :
             timePeriod === "30d" ? "Daily trends for the last 30 days" :
             "Monthly income vs expenditure trends"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timePeriod === "7d" || timePeriod === "30d" ? (
            // Daily line chart for short periods
            dailyTrendsData.length > 0 ? (
              <ChartContainer config={CHART_CONFIG}>
                <LineChart
                  accessibilityLayer
                  data={dailyTrendsData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value}
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
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    dataKey="income"
                    type="monotone"
                    stroke="var(--color-income)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-income)", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    dataKey="expenditure"
                    type="monotone"
                    stroke="var(--color-expenditure)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-expenditure)", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available for selected period
              </div>
            )
          ) : (
            // Monthly area chart for longer periods
            monthlyData.length > 0 ? (
              <ChartContainer config={CHART_CONFIG}>
                <AreaChart
                  accessibilityLayer
                  data={monthlyData}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
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
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="income"
                    type="natural"
                    fill="var(--color-income)"
                    fillOpacity={0.4}
                    stroke="var(--color-income)"
                  />
                  <Area
                    dataKey="expenditure"
                    type="natural"
                    fill="var(--color-expenditure)"
                    fillOpacity={0.4}
                    stroke="var(--color-expenditure)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available for selected period
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>
            {timePeriod === "7d" || timePeriod === "30d"
              ? "Daily comparison for selected period"
              : "Monthly comparison of income and expenditure"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timePeriod === "7d" || timePeriod === "30d" ? (
            // Daily bar chart for short periods
            dailyTrendsData.length > 0 ? (
              <ChartContainer config={CHART_CONFIG}>
                <BarChart accessibilityLayer data={dailyTrendsData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value}
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
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
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
                No data available for selected period
              </div>
            )
          ) : (
            // Monthly bar chart for longer periods
            monthlyData.length > 0 ? (
              <ChartContainer config={CHART_CONFIG}>
                <BarChart accessibilityLayer data={monthlyData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
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
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
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
                No data available for selected period
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Income vs Expenditure Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenditure</CardTitle>
            <CardDescription>Overall distribution for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeExpenditurePie.some((item) => item.value > 0) ? (
              <>
                <ChartContainer
                  config={CHART_CONFIG}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
  formatter={(value) => formatCurrency(Number(value))}
/>

                    
                    }
                  />

                    <Pie
                      data={incomeExpenditurePie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      <Cell key="income" fill="var(--color-income)" />
                      <Cell key="expenditure" fill="var(--color-expenditure)" />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                {/* Color Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                  {incomeExpenditurePie.map((item) => {
                    const color = item.name === "Income" 
                      ? CHART_CONFIG.income.color 
                      : CHART_CONFIG.expenditure.color;
                    return (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fund Type Breakdown</CardTitle>
            <CardDescription>Income and expenditure by fund type for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {fundTypeData.length > 0 ? (
              <ChartContainer 
                config={CHART_CONFIG}
                className="h-[400px] w-full overflow-x-hidden [&>div]:!aspect-auto"
              >
                <BarChart
                  accessibilityLayer
                  data={fundTypeData}
                  layout="vertical"
                  margin={{
                    left: 8,
                    right: 8,
                  }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    width={150}
                    tickFormatter={(value) => truncateLabel(value, 20)}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrencyAxis(value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [formatCurrency(Number(value)), ""]}
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
                No data available for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Types and Expenditure Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income Categories</CardTitle>
            <CardDescription>Breakdown of income sources for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeTypesData.length > 0 ? (
              <>
                <ChartContainer
                  config={DETAILED_CHART_CONFIG}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(Number(value)), ""]}
                        />
                      }
                    />
                    <Pie
                      data={incomeTypesData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      {incomeTypesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`var(--chart-${(index % 5) + 1})`}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                {/* Color Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t">
                  {incomeTypesData.map((entry, index) => {
                    const colorVar = `--chart-${(index % 5) + 1}`;
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: `var(${colorVar})` }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No income data available for selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenditure Categories</CardTitle>
            <CardDescription>Breakdown of expenditure categories for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {expenditureTypesData.length > 0 ? (
              <>
                <ChartContainer
                  config={DETAILED_CHART_CONFIG}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCurrency(Number(value)), ""]}
                        />
                      }
                    />
                    <Pie
                      data={expenditureTypesData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      {expenditureTypesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`var(--chart-${(index % 5) + 1})`}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                {/* Color Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t">
                  {expenditureTypesData.map((entry, index) => {
                    const colorVar = `--chart-${(index % 5) + 1}`;
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: `var(${colorVar})` }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expenditure data available for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

