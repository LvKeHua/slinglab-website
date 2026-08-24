import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatPnL(value: number): string {
  return `${value >= 0 ? '+' : '-'}$${formatCurrency(Math.abs(value))}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatHoldTime(holdTime: string): string {
  // holdTime already in e.g. "2h 9m 42s" format
  return holdTime
}

export function formatQuantity(value: number): string {
  if (value >= 1) return value.toFixed(3)
  if (value >= 0.001) return value.toFixed(4)
  return value.toFixed(6)
}

export function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (value >= 1) return value.toFixed(2)
  return value.toFixed(4)
}
