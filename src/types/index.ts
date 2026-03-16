// Common types for the application

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'vendor' | 'farmer';
  image?: string;
}

export interface Farmer {
  _id?: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    upiId?: string;
  };
  cropTypes?: string[];
  currentBalance: number;
  balanceType: 'receivable' | 'payable';
  isActive: boolean;
  financialYear?: string;
  createdBy?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Customer {
  _id?: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  commissionRate: number;
  hamaliCharge: number;
  marketFeeRate: number;
  currentBalance: number;
  balanceType: 'receivable' | 'payable';
  isActive: boolean;
  financialYear?: string;
  createdBy?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Vegetable {
  _id?: string;
  code: string;
  name: string;
  localName?: string;
  category: 'Leafy' | 'Root' | 'Fruit' | 'Flower' | 'Stem' | 'Bulb' | 'Other';
  unit: 'kg' | 'dozen' | 'piece' | 'bundle';
  defaultPrice: number;
  isActive: boolean;
  createdBy?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BillItem {
  vegetableCode: string;
  vegetableName: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Buyer {
  customerCode: string;
  customerName: string;
  commissionRate: number;
  hamaliCharge: number;
  marketFeeRate: number;
  items: BillItem[];
  grossAmount: number;
  commission: number;
  hamali: number;
  marketFee: number;
  totalDeductions: number;
  netAmount: number;
}

export interface SalesBillTotals {
  totalQty: number;
  grossAmount: number;
  totalCommission: number;
  totalHamali: number;
  totalMarketFee: number;
  totalDeductions: number;
  netPayable: number;
}

export interface SalesBill {
  _id?: string;
  billNumber: string;
  billDate: Date | string;
  farmerCode: string;
  farmerName: string;
  buyers: Buyer[];
  totals: SalesBillTotals;
  paidAmount: number;
  balanceAmount: number;
  status: 'pending' | 'partial' | 'settled';
  financialYear: string;
  createdBy?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Settlement {
  billNumber: string;
  billDate: string;
  billAmount: number;
  settlingAmount: number;
}

export interface Payment {
  _id?: string;
  voucherNumber: string;
  type: 'receipt' | 'payment';
  date: Date | string;
  partyType: 'Customer' | 'Farmer';
  partyCode: string;
  partyName: string;
  amount: number;
  mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  reference?: string;
  settlements?: Settlement[];
  kasar?: number;
  narration?: string;
  financialYear: string;
  createdBy?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplyEntry {
  _id?: string;
  entryNumber: string;
  date: Date | string;
  farmerCode: string;
  farmerName: string;
  items: {
    vegetableCode: string;
    vegetableName: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }[];
  totalQty: number;
  totalAmount: number;
  financialYear: string;
  createdBy?: string;
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditLog {
  _id?: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Financial Year type
export interface FinancialYear {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
}

// Dashboard Stats types
export interface DashboardStats {
  todaySales: number;
  totalReceivable: number;
  totalPayable: number;
  todaysCollection: number;
  pendingBills: number;
  activeCustomers: number;
  activeFarmers: number;
}

// Report types
export interface CustomerBalanceReport {
  code: string;
  name: string;
  totalBilled: number;
  received: number;
  balance: number;
}

export interface FarmerPayableReport {
  code: string;
  name: string;
  totalSales: number;
  paid: number;
  payable: number;
}

export interface DailySalesReport {
  date: string;
  bills: number;
  farmers: number;
  totalQty: number;
  grossAmount: number;
  netPayable: number;
}

export interface VegetableWiseReport {
  name: string;
  totalQty: number;
  totalAmount: number;
  avgRate: number;
}
