'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FiPlus, FiArrowUpCircle, FiArrowDownCircle, FiFilter, FiEye, FiEdit2, FiDownload } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select } from '@/components/ui';
import { generatePaymentPDF } from '@/lib/pdf';
import { fetchPayments } from '@/lib/onlineService';
import type { Payment } from '@/types';

interface TransactionItem {
  id: string;
  localId?: string;
  voucherNumber: string;
  type: string;
  date: string;
  partyType: string;
  partyCode: string;
  partyName: string;
  amount: number;
  mode: string;
  reference: string;
  narration: string;
  billReferences: string[];
}

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'payment', label: 'Payments' },
];

const modeOptions = [
  { value: '', label: 'All Modes' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cheque', label: 'Cheque' },
];

export default function CashBookPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Load payments (API-first) ─────────────────────
  const loadTransactions = useCallback(async () => {
    try {
      const storeData = await fetchPayments();
      const mapped: TransactionItem[] = storeData.map((p: any) => ({
        id: p.localId || p._id || p.id,
        localId: p.localId,
        voucherNumber: p.voucherNumber,
        type: p.type,
        date: p.voucherDate,
        partyType: p.customerId ? 'Customer' : 'Farmer',
        partyCode: p.customerCode || p.farmerCode || '',
        partyName: p.customerName || p.farmerName || '',
        amount: p.amount || p.netAmount || 0,
        mode: p.paymentMode || 'Cash',
        reference: p.chequeNumber || p.upiReference || '',
        narration: p.narration || '',
        billReferences: p.billNumber ? [p.billNumber] : [],
      }));
      setTransactions(mapped);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchType = !typeFilter || tx.type === typeFilter;
    const matchMode = !modeFilter || tx.mode === modeFilter;
    const matchDateFrom = !dateFrom || tx.date >= dateFrom;
    const matchDateTo = !dateTo || tx.date <= dateTo;
    return matchType && matchMode && matchDateFrom && matchDateTo;
  });

  // Calculate summaries from ALL transactions (not just filtered)
  const summary = transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'receipt') {
        acc.totalReceipts += tx.amount;
        acc.receiptCount++;
      } else {
        acc.totalPayments += tx.amount;
        acc.paymentCount++;
      }
      return acc;
    },
    { totalReceipts: 0, totalPayments: 0, receiptCount: 0, paymentCount: 0 }
  );

  const columns = [
    { key: 'voucherNumber', header: 'Voucher No.', sortable: true },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <Badge variant={value === 'receipt' ? 'success' : 'danger'}>
          {value === 'receipt' ? (
            <span className="flex items-center gap-1">
              <FiArrowDownCircle /> Receipt
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <FiArrowUpCircle /> Payment
            </span>
          )}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'partyName',
      header: 'Party',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-gray-500">
            {row.partyType}: {row.partyCode}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (value: number, row: any) => (
        <span
          className={`font-bold ${
            row.type === 'receipt' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          ₹{Math.abs(value).toLocaleString()}
        </span>
      ),
    },
    { key: 'mode', header: 'Mode' },
    {
      key: 'billReferences',
      header: 'Bills',
      render: (value: string[]) =>
        value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.map((bill) => (
              <Badge key={bill} variant="info" size="sm">
                {bill}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: TransactionItem) => (
        <div className="flex gap-1">
          <Link href={`/vendor/cashbook/${row.id}`}>
            <Button size="sm" variant="ghost" title="View">
              <FiEye className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/vendor/cashbook/${row.type === 'receipt' ? 'receipt' : 'payment'}?edit=${row.id}`}>
            <Button size="sm" variant="ghost" title="Edit">
              <FiEdit2 className="w-4 h-4 text-blue-500" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" title="Download PDF" onClick={() => handleDownloadPDF(row)}>
            <FiDownload className="w-4 h-4 text-green-600" />
          </Button>
        </div>
      ),
    },
  ];

  const clearFilters = () => {
    setTypeFilter('');
    setModeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const handleDownloadPDF = (row: TransactionItem) => {
    try {
      const paymentData: Payment = {
        voucherNumber: row.voucherNumber,
        type: row.type as 'receipt' | 'payment',
        date: row.date,
        partyType: row.partyType as 'Customer' | 'Farmer',
        partyCode: row.partyCode,
        partyName: row.partyName,
        amount: row.amount,
        mode: row.mode as 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque',
        reference: row.reference || undefined,
        narration: row.narration || undefined,
        settlements: row.billReferences.map((bill) => ({
          billNumber: bill,
          billDate: row.date,
          billAmount: row.amount,
          settlingAmount: row.amount / row.billReferences.length,
        })),
        financialYear: '2024-25',
      };
      generatePaymentPDF(paymentData);
      toast.success(`PDF downloaded: ${row.voucherNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Book</h1>
        <div className="flex gap-2">
          <Link href="/vendor/cashbook/receipt">
            <Button variant="secondary" leftIcon={<FiArrowDownCircle />}>
              New Receipt
            </Button>
          </Link>
          <Link href="/vendor/cashbook/payment">
            <Button leftIcon={<FiArrowUpCircle />}>New Payment</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Receipts */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-green-600">
              <FiArrowDownCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Total Receipts</span>
            </div>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs font-bold">
              {summary.receiptCount}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            ₹{summary.totalReceipts.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.receiptCount} receipt{summary.receiptCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Total Payments */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-500">
              <FiArrowUpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Total Payments</span>
            </div>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-xs font-bold">
              {summary.paymentCount}
            </span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            ₹{summary.totalPayments.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary.paymentCount} payment{summary.paymentCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <span className="text-sm font-medium">Net Cash Flow</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              summary.totalReceipts - summary.totalPayments >= 0
                ? 'text-green-600'
                : 'text-red-500'
            }`}
          >
            {summary.totalReceipts - summary.totalPayments >= 0 ? '+' : ''}₹
            {(summary.totalReceipts - summary.totalPayments).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Receipts − Payments</p>
        </div>

        {/* Total Transactions */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-600">All Transactions</span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold">
              {summary.receiptCount + summary.paymentCount}
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {summary.receiptCount + summary.paymentCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.receiptCount}↓ receipts · {summary.paymentCount}↑ payments
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={typeOptions}
            />
            <Select
              label="Mode"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              options={modeOptions}
            />
            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div className="flex items-end">
              <Button variant="secondary" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        <CardHeader
          title="Transactions"
          subtitle={`Showing ${filteredTransactions.length} of ${transactions.length} transactions`}
        />
        <DataTable
          columns={columns}
          data={filteredTransactions}
          keyField="id"
          searchPlaceholder="Search by voucher, party name..."
          pageSize={10}
        />
      </Card>
    </div>
  );
}
