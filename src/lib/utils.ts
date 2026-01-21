import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)
}

// Helper function to format currency for chart axes using Indian numbering system
export function formatCurrencyAxis(value: number): string {
  if (value >= 10000000) {
    // Crores (1 crore = 10 million)
    return `₹${(value / 10000000).toFixed(1)}Cr`
  } else if (value >= 100000) {
    // Lakhs (1 lakh = 100 thousand)
    return `₹${(value / 100000).toFixed(1)}L`
  } else if (value >= 1000) {
    // Thousands
    return `₹${(value / 1000).toFixed(0)}k`
  } else {
    return `₹${value.toFixed(0)}`
  }
}
