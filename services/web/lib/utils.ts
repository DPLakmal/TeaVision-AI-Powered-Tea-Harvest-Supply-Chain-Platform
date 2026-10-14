import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatKg(weight: number | undefined | null, decimals: number = 1): string {
  if (weight === undefined || weight === null || isNaN(weight)) return "0.0 kg";
  return `${weight.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kg`;
}

export function formatCurrency(amount: number | undefined | null, currency: string = "USD"): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number | undefined | null, includeSign: boolean = true): string {
  if (value === undefined || value === null || isNaN(value)) return "0.0%";
  const formatted = Math.abs(value).toFixed(1);
  if (!includeSign) return `${formatted}%`;
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatted}%`;
}

export function formatDate(dateString: string | Date | undefined | null, formatStr: string = "MMM dd, yyyy"): string {
  if (!dateString) return "N/A";
  try {
    const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return format(d, formatStr);
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString: string | Date | undefined | null): string {
  return formatDate(dateString, "MMM dd, yyyy · HH:mm");
}

export function calculateQualityScore(highKg: number, mediumKg: number, lowKg: number): number {
  const total = highKg + mediumKg + lowKg;
  if (total <= 0) return 0;
  // Weighted: high=100, medium=60, low=20
  const score = (highKg * 100 + mediumKg * 60 + lowKg * 20) / total;
  return Math.round(score * 10) / 10;
}
