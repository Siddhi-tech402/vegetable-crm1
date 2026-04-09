'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FiDollarSign,
  FiShoppingBag,
  FiUsers,
  FiTruck,
  FiCreditCard,
  FiBarChart2,
  FiPlus,
  FiFileText,
} from 'react-icons/fi';
import { StatCard, Card, CardHeader, DataTable, Badge, Button } from '@/components/ui';
import { format } from 'date-fns';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { fetchSalesBills, fetchPayments, fetchCustomers, fetchFarmers } from '@/lib/onlineService';

export default function VendorDashboard() {
  const { data: session } = useSession();
  const { financialYear } = useFinancialYear();

  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    customerReceivable: 0,
    farmerPayable: 0,
    todayCollection: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // ── Load dashboard data (API-first) ─────────────────
  const loadDashboardData = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Load recent bills
      const allBills = await fetchSalesBills();
      const mappedBills = allBills
        .sort((a: any, b: any) => (b.billDate || '').localeCompare(a.billDate || ''))
        .slice(0, 5)
        .map((b: any) => ({
          id: b.localId || b._id,
          billNumber: b.billNumber,
          billDate: b.billDate,
          farmerName: b.farmerName,
          totalAmount: b.totalSaleAmount || 0,
          netPayable: b.netPayableToFarmer || 0,
          status: b.status || 'pending',
        }));
      setRecentBills(mappedBills);

      // Load recent payments
      const allPayments = await fetchPayments();
      const mappedPayments = allPayments
        .sort((a: any, b: any) => (b.voucherDate || '').localeCompare(a.voucherDate || ''))
        .slice(0, 5)
        .map((p: any) => ({
          id: p.localId || p._id,
          voucherNumber: p.voucherNumber,
          date: p.voucherDate,
          partyName: p.customerName || p.farmerName || '',
          type: p.type,
          amount: p.amount || p.netAmount || 0,
        }));
      setRecentPayments(mappedPayments);

      // Calculate stats
      // billDate & voucherDate come from MongoDB as ISO strings e.g. "2026-04-09T00:00:00.000Z"
      // so we use startsWith(today) to match just the date part
      const todayBills = allBills.filter((b: any) => {
        const dateStr = b.billDate ? String(b.billDate).substring(0, 10) : '';
        return dateStr === today;
      });
      const todaySales = todayBills.reduce((sum: number, b: any) => sum + (b.totalSaleAmount || 0), 0);

      const todayReceipts = allPayments.filter((p: any) => {
        const dateStr = p.voucherDate ? String(p.voucherDate).substring(0, 10) : '';
        return dateStr === today && p.type === 'receipt';
      });
      const todayCollection = todayReceipts.reduce(
        (sum: number, p: any) => sum + (p.amount || p.netAmount || 0),
        0
      );

      // Customer receivable
      const allCustomers = await fetchCustomers();
      const customerReceivable = allCustomers
        .filter((c: any) => c.balanceType === 'Dr')
        .reduce((sum: number, c: any) => sum + (c.currentBalance || 0), 0);

      // Farmer payable
      const allFarmers = await fetchFarmers();
      const farmerPayable = allFarmers
        .filter((f: any) => f.balanceType === 'Cr')
        .reduce((sum: number, f: any) => sum + (f.currentBalance || 0), 0);

      setStats({ todaySales, customerReceivable, farmerPayable, todayCollection });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const billColumns = [
    { key: 'billNumber', header: 'Bill No.' },
    {
      key: 'billDate',
      header: 'Date',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    { key: 'farmerName', header: 'Farmer' },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'settled' ? 'success' : value === 'pending' ? 'warning' : 'info'}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  const paymentColumns = [
    { key: 'voucherNumber', header: 'Voucher' },
    {
      key: 'date',
      header: 'Date',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    { key: 'partyName', header: 'Party' },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <Badge variant={value === 'receipt' ? 'success' : 'info'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (value: number, row: any) => (
        <span className={row.type === 'receipt' ? 'text-green-600' : 'text-blue-600'}>
          ₹{value.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {session?.user?.name || 'Vendor'}!</h1>
            <p className="mt-1 opacity-90">Financial Year: {financialYear}</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Link href="/vendor/sales/new">
              <Button variant="secondary" leftIcon={<FiPlus />}>
                New Sales Bill
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`₹${stats.todaySales.toLocaleString()}`}
          icon={<FiShoppingBag className="w-6 h-6" />}
          colorClass="bg-primary-500"
        />
        <StatCard
          title="Customer Receivable"
          value={`₹${stats.customerReceivable.toLocaleString()}`}
          icon={<FiUsers className="w-6 h-6" />}
          colorClass="bg-blue-500"
        />
        <StatCard
          title="Farmer Payable"
          value={`₹${stats.farmerPayable.toLocaleString()}`}
          icon={<FiTruck className="w-6 h-6" />}
          colorClass="bg-yellow-500"
        />
        <StatCard
          title="Today's Collection"
          value={`₹${stats.todayCollection.toLocaleString()}`}
          icon={<FiDollarSign className="w-6 h-6" />}
          colorClass="bg-green-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Link href="/vendor/sales/new">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center touch-target flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-2">
              <FiFileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Bill</span>
          </div>
        </Link>
        <Link href="/vendor/cashbook?type=receipt">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center touch-target flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-2">
              <FiCreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Receipt</span>
          </div>
        </Link>
        <Link href="/vendor/cashbook?type=payment">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center touch-target flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
              <FiDollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment</span>
          </div>
        </Link>
        <Link href="/vendor/masters/customers">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center touch-target flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-2">
              <FiUsers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customers</span>
          </div>
        </Link>
        <Link href="/vendor/masters/farmers">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center touch-target flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-2">
              <FiTruck className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Farmers</span>
          </div>
        </Link>
        <Link href="/vendor/reports">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center touch-target flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-2">
              <FiBarChart2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reports</span>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Recent Sales Bills"
            action={
              <Link href="/vendor/sales">
                <Button size="sm" variant="ghost">
                  View All
                </Button>
              </Link>
            }
          />
          <DataTable
            columns={billColumns}
            data={recentBills}
            keyField="id"
            searchable={false}
            pageSize={5}
          />
        </Card>

        <Card>
          <CardHeader
            title="Recent Transactions"
            action={
              <Link href="/vendor/cashbook">
                <Button size="sm" variant="ghost">
                  View All
                </Button>
              </Link>
            }
          />
          <DataTable
            columns={paymentColumns}
            data={recentPayments}
            keyField="id"
            searchable={false}
            pageSize={5}
          />
        </Card>
      </div>
    </div>
  );
}
