'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FiDollarSign, FiShoppingBag, FiTruck, FiClock } from 'react-icons/fi';
import { StatCard, Card, CardHeader, DataTable, Badge } from '@/components/ui';
import { format } from 'date-fns';
import { fetchSalesBills, fetchSupplyEntries, fetchPayments } from '@/lib/onlineService';

export default function FarmerDashboard() {
  const { data: session } = useSession();
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentSupplies, setRecentSupplies] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingAmount: 0,
    receivedAmount: 0,
    totalSupplyQty: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Load sales bills
      const allBills = await fetchSalesBills();
      const mappedBills = allBills
        .sort((a: any, b: any) => (b.billDate || '').localeCompare(a.billDate || ''))
        .slice(0, 5)
        .map((b: any) => ({
          id: b.localId || b._id,
          billNumber: b.billNumber,
          date: b.billDate,
          totalAmount: b.totalSaleAmount || 0,
          netPayable: b.netPayableToFarmer || 0,
          status: b.status || 'pending',
        }));
      setRecentSales(mappedBills);

      // Load supply entries
      const allSupplies = await fetchSupplyEntries();
      const mappedSupplies = allSupplies
        .sort((a: any, b: any) => (b.entryDate || '').localeCompare(a.entryDate || ''))
        .slice(0, 5)
        .map((s: any) => ({
          id: s.localId || s._id,
          vegetable: s.vegetableName,
          quantity: s.quantity || 0,
          unit: s.unit || 'kg',
          expectedPrice: s.expectedPrice || 0,
          status: s.status || 'pending',
        }));
      setRecentSupplies(mappedSupplies);

      // Calculate stats
      const totalSales = allBills.reduce((sum: number, b: any) => sum + (b.totalSaleAmount || 0), 0);
      const paidAmount = allBills.reduce((sum: number, b: any) => sum + (b.paidAmount || 0), 0);
      const pendingAmount = totalSales - paidAmount;
      const totalSupplyQty = allSupplies.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);

      setStats({
        totalSales,
        pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
        receivedAmount: paidAmount,
        totalSupplyQty,
      });
    } catch (error) {
      console.error('Failed to load farmer dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const salesColumns = [
    { key: 'billNumber', header: 'Bill No.', sortable: true },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
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

  const supplyColumns = [
    { key: 'vegetable', header: 'Vegetable', sortable: true },
    { key: 'quantity', header: 'Qty', sortable: true },
    { key: 'unit', header: 'Unit' },
    {
      key: 'expectedPrice',
      header: 'Exp. Price',
      render: (value: number) => `₹${value}/kg`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'sold' ? 'success' : value === 'pending' ? 'warning' : 'info'}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {session?.user?.name || 'Farmer'}!</h1>
        <p className="mt-1 opacity-90">Here's an overview of your account</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={`₹${stats.totalSales.toLocaleString()}`}
          icon={<FiShoppingBag className="w-6 h-6" />}
          colorClass="bg-primary-500"
        />
        <StatCard
          title="Pending Amount"
          value={`₹${stats.pendingAmount.toLocaleString()}`}
          icon={<FiClock className="w-6 h-6" />}
          colorClass="bg-yellow-500"
        />
        <StatCard
          title="Received Amount"
          value={`₹${stats.receivedAmount.toLocaleString()}`}
          icon={<FiDollarSign className="w-6 h-6" />}
          colorClass="bg-green-500"
        />
        <StatCard
          title="Total Supplies"
          value={`${stats.totalSupplyQty} kg`}
          icon={<FiTruck className="w-6 h-6" />}
          colorClass="bg-blue-500"
        />
      </div>

      {/* Recent Sales & Supplies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Recent Sales" subtitle="Your latest sales bills" />
          <DataTable
            columns={salesColumns}
            data={recentSales}
            keyField="id"
            searchable={false}
            pageSize={5}
          />
        </Card>

        <Card>
          <CardHeader title="Recent Supplies" subtitle="Your recent vegetable supplies" />
          <DataTable
            columns={supplyColumns}
            data={recentSupplies}
            keyField="id"
            searchable={false}
            pageSize={5}
          />
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/farmer/supply"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-target"
          >
            <FiTruck className="w-8 h-8 text-primary-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Supply</span>
          </a>
          <a
            href="/farmer/sales"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-target"
          >
            <FiShoppingBag className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Sales</span>
          </a>
          <a
            href="/farmer/settlements"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-target"
          >
            <FiDollarSign className="w-8 h-8 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Settlements</span>
          </a>
          <a
            href="/farmer/profile"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-target"
          >
            <FiClock className="w-8 h-8 text-yellow-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile</span>
          </a>
        </div>
      </Card>
    </div>
  );
}
