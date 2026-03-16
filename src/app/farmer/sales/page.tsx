'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiEye, FiFilter } from 'react-icons/fi';
import { format } from 'date-fns';
import { Card, CardHeader, DataTable, Badge, Button, Input, Modal } from '@/components/ui';
import { fetchSalesBills } from '@/lib/onlineService';

interface SaleItem {
  id: string;
  billNumber: string;
  billDate: string;
  buyers: { name: string; amount: number }[];
  totalAmount: number;
  commission: number;
  marketFee: number;
  hamali: number;
  totalDeductions: number;
  netPayable: number;
  paidAmount: number;
  status: string;
}

export default function FarmerSalesPage() {
  const [salesData, setSalesData] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBill, setSelectedBill] = useState<SaleItem | null>(null);

  const loadSales = useCallback(async (params?: Record<string, string>) => {
    setIsLoading(true);
    try {
      const allBills = await fetchSalesBills(params);
      const items: SaleItem[] = (allBills as any[]).map((bill: any) => {
        const buyers = (bill.buyers || []).map((b: any) => ({
          name: b.customerName || b.customerCode || '',
          amount: b.grossAmount || 0,
        }));
        const totalAmount = bill.totals?.grossAmount || buyers.reduce((s: number, b: any) => s + b.amount, 0);
        const commission = bill.totals?.totalCommission || 0;
        const marketFee = bill.totals?.totalMarketFee || 0;
        const hamali = bill.totals?.totalHamali || 0;
        const totalDeductions = bill.totals?.totalDeductions || commission + marketFee + hamali;
        const netPayable = bill.totals?.netPayable || totalAmount - totalDeductions;
        return {
          id: bill.localId || bill._id || '',
          billNumber: bill.billNumber || '',
          billDate: bill.billDate ? String(bill.billDate).split('T')[0] : '',
          buyers,
          totalAmount,
          commission,
          marketFee,
          hamali,
          totalDeductions,
          netPayable,
          paidAmount: bill.paidAmount || 0,
          status: bill.status || 'pending',
        };
      });
      setSalesData(items);
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApplyFilter = () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    loadSales(params);
  };

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const columns = [
    { key: 'billNumber', header: 'Bill No.', sortable: true },
    {
      key: 'billDate',
      header: 'Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'buyers',
      header: 'Buyers',
      render: (value: { name: string }[]) => (
        <span className="text-sm">{value.map((b) => b.name).join(', ')}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Sale',
      sortable: true,
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      render: (value: number) => (
        <span className="text-red-600 dark:text-red-400">-₹{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          ₹{value.toLocaleString()}
        </span>
      ),
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
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: SaleItem) => (
        <Button size="sm" variant="ghost" onClick={() => setSelectedBill(row)}>
          <FiEye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  // Calculate totals
  const totalSales = salesData.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalDeductions = salesData.reduce((sum, item) => sum + item.totalDeductions, 0);
  const totalNetPayable = salesData.reduce((sum, item) => sum + item.netPayable, 0);
  const totalPaid = salesData.reduce((sum, item) => sum + item.paidAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales History</h1>
        <Button leftIcon={<FiDownload />} variant="outline">
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ₹{totalSales.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Deductions</p>
          <p className="text-xl font-bold text-red-600">₹{totalDeductions.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Payable</p>
          <p className="text-xl font-bold text-green-600">₹{totalNetPayable.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Received</p>
          <p className="text-xl font-bold text-blue-600">₹{totalPaid.toLocaleString()}</p>
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

      {/* Sales Table */}
      <Card>
        <CardHeader title="Sales Bills" subtitle="All your sales transactions" />
        <DataTable
          columns={columns}
          data={salesData}
          keyField="id"
          searchPlaceholder="Search by bill number..."
          pageSize={10}
        />
      </Card>

      {/* Bill Detail Modal */}
      <Modal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={`Bill Details - ${selectedBill?.billNumber}`}
        size="lg"
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bill Date</p>
                <p className="font-medium">
                  {format(new Date(selectedBill.billDate), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <Badge
                  variant={
                    selectedBill.status === 'settled'
                      ? 'success'
                      : selectedBill.status === 'pending'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {selectedBill.status.charAt(0).toUpperCase() + selectedBill.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold mb-2">Buyers</h4>
              {selectedBill.buyers.map((buyer, index) => (
                <div
                  key={index}
                  className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span>{buyer.name}</span>
                  <span className="font-medium">₹{buyer.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Total Sale Amount</span>
                <span className="font-medium">₹{selectedBill.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Commission</span>
                <span>-₹{selectedBill.commission.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Market Fee</span>
                <span>-₹{selectedBill.marketFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Hamali</span>
                <span>-₹{selectedBill.hamali.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Net Payable</span>
                <span className="text-green-600">₹{selectedBill.netPayable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount</span>
                <span className="text-blue-600">₹{selectedBill.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Pending Amount</span>
                <span className="text-yellow-600">
                  ₹{(selectedBill.netPayable - selectedBill.paidAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
