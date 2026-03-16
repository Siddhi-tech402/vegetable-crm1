import { format, parse, isValid } from 'date-fns';

/**
 * Format a number as Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with Indian number system (lakhs, crores)
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format a date to DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd/MM/yyyy');
}

/**
 * Format a date to DD MMM YYYY
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd MMM yyyy');
}

/**
 * Format a date to YYYY-MM-DD for input fields
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

/**
 * Get the current financial year string
 */
export function getCurrentFinancialYear(): string {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  // Financial year starts from April
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

/**
 * Get the financial year for a given date
 */
export function getFinancialYearForDate(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

/**
 * Get list of financial years for dropdown
 */
export function getFinancialYearOptions(yearsBack: number = 3): { value: string; label: string }[] {
  const currentFY = getCurrentFinancialYear();
  const currentYear = parseInt(currentFY.split('-')[0]);
  const options = [];

  for (let i = 0; i <= yearsBack; i++) {
    const fyYear = currentYear - i;
    const fy = `${fyYear}-${(fyYear + 1).toString().slice(-2)}`;
    options.push({
      value: fy,
      label: `FY ${fy}`,
    });
  }

  return options;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Calculate commission, hamali, market fee
 */
export function calculateDeductions(
  grossAmount: number,
  totalQty: number,
  commissionRate: number,
  hamaliPerUnit: number,
  marketFeeRate: number
): {
  commission: number;
  hamali: number;
  marketFee: number;
  totalDeductions: number;
  netAmount: number;
} {
  const commission = Math.round((grossAmount * commissionRate) / 100);
  const hamali = Math.round(totalQty * hamaliPerUnit);
  const marketFee = Math.round((grossAmount * marketFeeRate) / 100);
  const totalDeductions = commission + hamali + marketFee;
  const netAmount = grossAmount - totalDeductions;

  return {
    commission,
    hamali,
    marketFee,
    totalDeductions,
    netAmount,
  };
}

/**
 * Validate phone number (Indian)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate GST number
 */
export function isValidGST(gst: string): boolean {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
}

/**
 * Validate IFSC code
 */
export function isValidIFSC(ifsc: string): boolean {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.toUpperCase());
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Download data as JSON file
 */
export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert to CSV and download
 */
export function downloadCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse query params from URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const queryString = url.split('?')[1];
  if (!queryString) return params;

  queryString.split('&').forEach((param) => {
    const [key, value] = param.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });

  return params;
}

/**
 * Build query string from params
 */
export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params).filter(([_, value]) => value !== undefined && value !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Check if running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (!isBrowser()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
