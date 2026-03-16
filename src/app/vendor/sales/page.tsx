'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FiPlus, FiEye, FiPrinter, FiTrash2, FiDownload } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select } from '@/components/ui';
import { generateSalesBillPDF } from '@/lib/pdf';
import { fetchSalesBills } from '@/lib/onlineService';
import type { SalesBill } from '@/types';

interface BillItem {
  id: string;
  localId?: string;
  billNumber: string;
  billDate: string;
  farmerCode: string;
  farmerName: string;
  totalQty: number;
  grossAmount: number;
  totalDeductions: number;
  netPayable: number;
  status: string;
  buyersCount: number;
  buyers?: any[];
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'settled', label: 'Settled' },
];

export default function SalesBillsPage() {
  const [bills, setBills] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Load sales bills (API-first) ─────────────────────
  const loadBills = useCallback(async () => {
    try {
      const storeData = await fetchSalesBills();
      const mapped: BillItem[] = (storeData || []).map((b: any) => ({
        id: b._id || b.localId || b.id,
        localId: b.localId,
        _id: b._id,
        billNumber: b.billNumber,
        billDate: b.billDate,
        farmerCode: b.farmerCode || '',
        farmerName: b.farmerName || '',
        totalQty: b.buyers?.reduce((sum: number, buyer: any) =>
          sum + (buyer.items?.reduce((s: number, i: any) => s + (i.qty || 0), 0) || 0), 0) || 0,
        grossAmount: b.totalSaleAmount || 0,
        totalDeductions: b.totalDeductions || 0,
        netPayable: b.netPayableToFarmer || 0,
        status: b.status || 'pending',
        buyersCount: b.buyers?.length || 0,
        buyers: b.buyers || [],
      }));
      setBills(mapped);
    } catch (error) {
      console.error('Failed to load sales bills:', error);
      setBills([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const columns = [
    { key: 'billNumber', header: 'Bill No.', sortable: true },
    {
      key: 'billDate',
      header: 'Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'farmerName',
      header: 'Farmer',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-gray-500">{row.farmerCode}</p>
        </div>
      ),
    },
    {
      key: 'buyersCount',
      header: 'Buyers',
      render: (value: number) => <Badge variant="info">{value} buyers</Badge>,
    },
    {
      key: 'totalQty',
      header: 'Qty',
      render: (value: number) => `${value} kg`,
    },
    {
      key: 'grossAmount',
      header: 'Gross',
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      render: (value: number) => (
        <span className="text-red-500">-₹{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      render: (value: number) => (
        <span className="font-bold text-green-600">₹{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => {
        const variants: Record<string, 'warning' | 'info' | 'success'> = {
          pending: 'warning',
          partial: 'info',
          settled: 'success',
        };
        return <Badge variant={variants[value]}>{value.charAt(0).toUpperCase() + value.slice(1)}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: BillItem) => (
        <div className="flex gap-1">
          <Link href={`/vendor/sales/${row.id}`}>
            <Button size="sm" variant="ghost" title="View Details">
              <FiEye className="w-4 h-4" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" title="Download PDF" onClick={() => handlePrint(row.id)}>
            <FiDownload className="w-4 h-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" title="Print" onClick={() => handlePrint(row.id)}>
            <FiPrinter className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Delete"
            onClick={() => handleDelete(row.id)}
            disabled={row.status !== 'pending'}
          >
            <FiTrash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this sales bill?')) {
      try {
        const item = bills.find((b) => b.id === id);
        const deleteId = (item as any)?._id || item?.localId || id;
        const res = await fetch(`/api/sales-bills/${deleteId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setBills((prev) => prev.filter((b) => b.id !== id));
        toast.success('Sales bill deleted');
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error('Failed to delete sales bill');
      }
    }
  };

  const handlePrint = (id: string) => {
    const bill = bills.find((b) => b.id === id);
    if (!bill) {
      toast.error('Bill not found');
      return;
    }
    try {
      const billData: SalesBill = {
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        farmerCode: bill.farmerCode,
        farmerName: bill.farmerName,
        buyers: [
          {
            customerCode: 'C0001',
            customerName: 'Customer',
            commissionRate: 8,
            hamaliCharge: 5,
            marketFeeRate: 1,
            items: [
              {
                vegetableCode: 'V0001',
                vegetableName: 'Mixed Vegetables',
                unit: 'kg',
                qty: bill.totalQty,
                rate: bill.grossAmount / (bill.totalQty || 1),
                amount: bill.grossAmount,
              },
            ],
            grossAmount: bill.grossAmount,
            commission: Math.round(bill.totalDeductions * 0.5),
            hamali: Math.round(bill.totalDeductions * 0.3),
            marketFee: Math.round(bill.totalDeductions * 0.2),
            totalDeductions: bill.totalDeductions,
            netAmount: bill.netPayable,
          },
        ],
        totals: {
          totalQty: bill.totalQty,
          grossAmount: bill.grossAmount,
          totalCommission: Math.round(bill.totalDeductions * 0.5),
          totalHamali: Math.round(bill.totalDeductions * 0.3),
          totalMarketFee: Math.round(bill.totalDeductions * 0.2),
          totalDeductions: bill.totalDeductions,
          netPayable: bill.netPayable,
        },
        paidAmount: bill.status === 'settled' ? bill.netPayable : 0,
        balanceAmount: bill.status === 'settled' ? 0 : bill.netPayable,
        status: bill.status as 'pending' | 'partial' | 'settled',
        financialYear: '2024-25',
      };
      generateSalesBillPDF(billData);
      toast.success(`PDF downloaded: ${bill.billNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Filter bills
  const filteredBills = bills.filter((bill) => {
    const matchDate = !dateFilter || bill.billDate === dateFilter;
    const matchStatus = !statusFilter || bill.status === statusFilter;
    return matchDate && matchStatus;
  });

  // Summary calculations
  const summary = filteredBills.reduce(
    (acc, bill) => {
      acc.totalBills++;
      acc.totalQty += bill.totalQty;
      acc.grossAmount += bill.grossAmount;
      acc.deductions += bill.totalDeductions;
      acc.netPayable += bill.netPayable;
      return acc;
    },
    { totalBills: 0, totalQty: 0, grossAmount: 0, deductions: 0, netPayable: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Bills</h1>
        <Link href="/vendor/sales/new">
          <Button leftIcon={<FiPlus />}>New Sales Bill</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Bills</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalBills}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalQty} kg</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Gross Amount</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₹{summary.grossAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Deductions</p>
          <p className="text-2xl font-bold text-red-500">
            ₹{summary.deductions.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Net Payable</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{summary.netPayable.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Filter by Date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setDateFilter('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        <CardHeader
          title="All Sales Bills"
          subtitle={`Showing ${filteredBills.length} of ${bills.length} bills`}
        />
        <DataTable
          columns={columns}
          data={filteredBills}
          keyField="id"
          searchPlaceholder="Search by bill number or farmer..."
          pageSize={10}
        />
      </Card>
    </div>
  );
}
