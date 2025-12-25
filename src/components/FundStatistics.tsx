"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFundTypeLabel, isIncome, isExpenditure } from "@/lib/fundTypeStatus";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

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

// Color palette for charts - using distinct, visible colors
const CHART_COLORS = {
  // Income colors (green shades)
  income: "#22c55e", // green-500
  incomeLight: "#4ade80", // green-400
  incomeDark: "#16a34a", // green-600
  
  // Expenditure colors (red shades)
  expenditure: "#ef4444", // red-500
  expenditureLight: "#f87171", // red-400
  expenditureDark: "#dc2626", // red-600
  
  // Fund type colors - distinct palette
  typeColors: [
    "#3b82f6", // blue-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#f59e0b", // amber-500
    "#10b981", // emerald-500
    "#06b6d4", // cyan-500
    "#6366f1", // indigo-500
    "#14b8a6", // teal-500
    "#f97316", // orange-500
    "#84cc16", // lime-500
    "#a855f7", // purple-500
    "#eab308", // yellow-500
    "#64748b", // slate-500
  ],
};

export default function FundStatistics({ funds }: FundStatisticsProps) {
  // Process data for time series (monthly income vs expenditure)
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; expenditure: number; month: string }>();

    funds.forEach((fund) => {
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
  }, [funds]);

  // Process data for fund type breakdown
  const fundTypeData = useMemo(() => {
    const typeMap = new Map<string, { name: string; income: number; expenditure: number }>();

    funds.forEach((fund) => {
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
  }, [funds]);

  // Process data for pie chart (income vs expenditure)
  const incomeExpenditurePie = useMemo(() => {
    const totalIncome = funds
      .filter((f) => f.is_credit)
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalExpenditure = funds
      .filter((f) => !f.is_credit)
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    return [
      { name: "Income", value: totalIncome },
      { name: "Expenditure", value: totalExpenditure },
    ];
  }, [funds]);

  // Process data for income types pie chart
  const incomeTypesData = useMemo(() => {
    const typeMap = new Map<string, number>();

    funds
      .filter((f) => f.is_credit && isIncome(f.type))
      .forEach((fund) => {
        const typeLabel = getFundTypeLabel(fund.type);
        typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + (fund.amount || 0));
      });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [funds]);

  // Process data for expenditure types pie chart
  const expenditureTypesData = useMemo(() => {
    const typeMap = new Map<string, number>();

    funds
      .filter((f) => !f.is_credit && isExpenditure(f.type))
      .forEach((fund) => {
        const typeLabel = getFundTypeLabel(fund.type);
        typeMap.set(typeLabel, (typeMap.get(typeLabel) || 0) + (fund.amount || 0));
      });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [funds]);

  // Calculate summary statistics
  const totalIncome = funds
    .filter((f) => f.is_credit)
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalExpenditure = funds
    .filter((f) => !f.is_credit)
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const netBalance = totalIncome - totalExpenditure;
  const transactionCount = funds.length;
  const avgTransactionAmount = transactionCount > 0 
    ? (totalIncome + totalExpenditure) / transactionCount 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
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
          <CardTitle>Income vs Expenditure Over Time</CardTitle>
          <CardDescription>Monthly comparison of income and expenditure</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke={CHART_COLORS.income}
                  fill={CHART_COLORS.income}
                  fillOpacity={0.6}
                  strokeWidth={2}
                  name="Income"
                />
                <Area
                  type="monotone"
                  dataKey="expenditure"
                  stroke={CHART_COLORS.expenditure}
                  fill={CHART_COLORS.expenditure}
                  fillOpacity={0.6}
                  strokeWidth={2}
                  name="Expenditure"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for time series
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>Income and expenditure by month</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Bar dataKey="income" fill={CHART_COLORS.income} name="Income" />
                <Bar dataKey="expenditure" fill={CHART_COLORS.expenditure} name="Expenditure" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for monthly trends
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income vs Expenditure Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenditure</CardTitle>
            <CardDescription>Overall distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeExpenditurePie.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeExpenditurePie}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeExpenditurePie.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? CHART_COLORS.income : CHART_COLORS.expenditure}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fund Type Breakdown</CardTitle>
            <CardDescription>Distribution by fund type</CardDescription>
          </CardHeader>
          <CardContent>
            {fundTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fundTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill={CHART_COLORS.income} name="Income" />
                  <Bar dataKey="expenditure" fill={CHART_COLORS.expenditure} name="Expenditure" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
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
            <CardDescription>Breakdown of income sources</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeTypesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeTypesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeTypesData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS.typeColors[index % CHART_COLORS.typeColors.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No income data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenditure Categories</CardTitle>
            <CardDescription>Breakdown of expenditure categories</CardDescription>
          </CardHeader>
          <CardContent>
            {expenditureTypesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenditureTypesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenditureTypesData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS.typeColors[index % CHART_COLORS.typeColors.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expenditure data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

