'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiFilter } from 'react-icons/fi';
import { format } from 'date-fns';
import { Card, CardHeader, DataTable, Badge, Button, Input } from '@/components/ui';
import { fetchPayments, fetchSalesBills } from '@/lib/onlineService';

interface SettlementItem {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  amount: number;
  paymentMode: string;
  billNumber: string;
  narration: string;
  status: string;
}

interface PendingBillItem {
  id: string;
  billNumber: string;
  billDate: string;
  netPayable: number;
  paidAmount: number;
  pendingAmount: number;
}

export default function FarmerSettlementsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [settlementData, setSettlementData] = useState<SettlementItem[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (params?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const [payments, bills] = await Promise.all([
        fetchPayments(params),
        fetchSalesBills(params),
      ]);

      // Map payments to settlement view (only farmer payments)
      const settlements: SettlementItem[] = (payments as any[])
        .filter((p: any) => p.type === 'payment' || p.partyType === 'Farmer')
        .map((p: any) => ({
          id: p.localId || p._id || '',
          voucherNumber: p.voucherNumber || '',
          voucherDate: p.voucherDate || (p.date ? String(p.date).split('T')[0] : ''),
          amount: p.amount || 0,
          paymentMode: p.paymentMode || p.mode || 'cash',
          billNumber: p.settlements?.[0]?.billNumber || '',
          narration: p.narration || '',
          status: 'confirmed',
        }));
      setSettlementData(settlements);

      // Calculate pending bills
      const pending: PendingBillItem[] = (bills as any[])
        .filter((b: any) => b.status !== 'settled')
        .map((b: any) => {
          const netPayable = b.totals?.netPayable || 0;
          const paidAmount = b.paidAmount || 0;
          const pendingAmount = netPayable - paidAmount;
          return {
            id: b.localId || b._id || '',
            billNumber: b.billNumber || '',
            billDate: b.billDate ? String(b.billDate).split('T')[0] : '',
            netPayable,
            paidAmount,
            pendingAmount,
          };
        })
        .filter((b) => b.pendingAmount > 0);
      setPendingBills(pending);
    } catch (error) {
      console.error('Failed to load settlements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApplyFilter = () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    loadData(params);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const settlementColumns = [
    { key: 'voucherNumber', header: 'Voucher No.', sortable: true },
    {
      key: 'voucherDate',
      header: 'Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    { key: 'billNumber', header: 'Bill No.' },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          ₹{value.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'paymentMode',
      header: 'Mode',
      render: (value: string) => (
        <Badge variant="info">{value.toUpperCase()}</Badge>
      ),
    },
    { key: 'narration', header: 'Narration' },
  ];

  const pendingColumns = [
    { key: 'billNumber', header: 'Bill No.', sortable: true },
    {
      key: 'billDate',
      header: 'Bill Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'paidAmount',
      header: 'Paid',
      render: (value: number) => (
        <span className="text-green-600">₹{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'pendingAmount',
      header: 'Pending',
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold text-yellow-600">₹{value.toLocaleString()}</span>
      ),
    },
  ];

  const totalReceived = settlementData.reduce((sum, item) => sum + item.amount, 0);
  const totalPending = pendingBills.reduce((sum, item) => sum + item.pendingAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settlement Report</h1>
        <Button leftIcon={<FiDownload />} variant="outline">
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">Total Received</p>
          <p className="text-3xl font-bold mt-1">₹{totalReceived.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">Total Pending</p>
          <p className="text-3xl font-bold mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">Pending Bills</p>
          <p className="text-3xl font-bold mt-1">{pendingBills.length}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <Input
            label="From Date"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full md:w-auto"
          />
          <Input
            label="To Date"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full md:w-auto"
          />
          <Button leftIcon={<FiFilter />} onClick={handleApplyFilter} isLoading={isLoading}>
            Apply Filter
          </Button>
        </div>
      </Card>

      {/* Pending Bills */}
      <Card>
        <CardHeader
          title="Pending Amounts"
          subtitle="Bills with outstanding payments"
        />
        <DataTable
          columns={pendingColumns}
          data={pendingBills}
          keyField="id"
          searchable={false}
          pageSize={5}
          emptyMessage="No pending amounts"
        />
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader
          title="Payment History"
          subtitle="All received payments"
        />
        <DataTable
          columns={settlementColumns}
          data={settlementData}
          keyField="id"
          searchPlaceholder="Search by voucher number..."
          pageSize={10}
        />
      </Card>
    </div>
  );
}
