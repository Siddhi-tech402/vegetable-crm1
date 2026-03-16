'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Input, Select, Badge } from '@/components/ui';
import { fetchCustomers, fetchSalesBills, fetchPayments, createPayment } from '@/lib/onlineService';

const modeOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cheque', label: 'Cheque' },
];

interface CustomerOption {
  value: string;
  label: string;
  balance: number;
}

interface PendingBill {
  billNumber: string;
  date: string;
  amount: number;
  balance: number;
}

interface BillSettlement {
  billNumber: string;
  date: string;
  billAmount: number;
  balance: number;
  settlingAmount: number;
}

export default function NewReceiptPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Master data from offline stores
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [pendingBills, setPendingBills] = useState<Record<string, PendingBill[]>>({});

  // Form state
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerCode, setCustomerCode] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [kasar, setKasar] = useState('');
  const [narration, setNarration] = useState('');

  // Bill settlements
  const [settlements, setSettlements] = useState<BillSettlement[]>([]);

  // Load customers and pending bills
  const loadData = useCallback(async () => {
    try {
      const [customersData, billsData, paymentsData] = await Promise.all([
        fetchCustomers(),
        fetchSalesBills(),
        fetchPayments(),
      ]);

      // Build customer options with outstanding balance
      const customerOptions: CustomerOption[] = (customersData as any[]).map((c: any) => {
        // Calculate outstanding: sum of buyer amounts for this customer across all bills
        let totalOwed = 0;
        for (const bill of billsData as any[]) {
          for (const buyer of bill.buyers || []) {
            if (buyer.customerCode === c.code) {
              totalOwed += buyer.grossAmount || 0;
            }
          }
        }
        const totalPaid = (paymentsData as any[])
          .filter((p: any) => p.partyCode === c.code && p.type === 'receipt')
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);
        return {
          value: c.code,
          label: `${c.code} - ${c.name}`,
          balance: totalOwed - totalPaid,
        };
      });
      setCustomers(customerOptions);

      // Build pending bills grouped by customer code
      const billsByCustomer: Record<string, PendingBill[]> = {};
      for (const bill of billsData as any[]) {
        for (const buyer of bill.buyers || []) {
          const code = buyer.customerCode;
          if (!code) continue;
          const amount = buyer.grossAmount || 0;
          // Approximate balance (full amount for simplicity; real app would track per-customer payments)
          if (amount <= 0) continue;
          if (!billsByCustomer[code]) billsByCustomer[code] = [];
          billsByCustomer[code].push({
            billNumber: bill.billNumber,
            date: bill.billDate ? String(bill.billDate).split('T')[0] : '',
            amount,
            balance: amount,
          });
        }
      }
      setPendingBills(billsByCustomer);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get customer bills when customer changes
  useEffect(() => {
    if (customerCode && pendingBills[customerCode]) {
      setSettlements(
        pendingBills[customerCode].map((bill) => ({
          billNumber: bill.billNumber,
          date: bill.date,
          billAmount: bill.amount,
          balance: bill.balance,
          settlingAmount: 0,
        }))
      );
    } else {
      setSettlements([]);
    }
  }, [customerCode, pendingBills]);

  // Calculate totals
  const totals = useMemo(() => {
    const settledAmount = settlements.reduce((sum, s) => sum + (s.settlingAmount || 0), 0);
    const kasarAmount = parseFloat(kasar) || 0;
    const totalReceived = parseFloat(totalAmount) || 0;
    const unallocated = totalReceived - settledAmount - kasarAmount;

    return {
      settledAmount,
      kasarAmount,
      totalReceived,
      unallocated,
    };
  }, [settlements, kasar, totalAmount]);

  // Update settlement amount
  const updateSettlement = (billNumber: string, amount: number) => {
    setSettlements((prev) =>
      prev.map((s) =>
        s.billNumber === billNumber
          ? { ...s, settlingAmount: Math.min(amount, s.balance) }
          : s
      )
    );
  };

  // Auto-allocate remaining amount
  const autoAllocate = () => {
    let remaining = totals.totalReceived - totals.kasarAmount;
    const newSettlements = settlements.map((s) => {
      if (remaining <= 0) return { ...s, settlingAmount: 0 };
      const settle = Math.min(remaining, s.balance);
      remaining -= settle;
      return { ...s, settlingAmount: settle };
    });
    setSettlements(newSettlements);
  };

  // Clear all settlements
  const clearSettlements = () => {
    setSettlements((prev) => prev.map((s) => ({ ...s, settlingAmount: 0 })));
  };

  // Get selected customer info
  const selectedCustomer = customers.find((c) => c.value === customerCode);

  // Save receipt
  const handleSave = async () => {
    if (!customerCode) {
      toast.error('Please select a customer');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (totals.unallocated !== 0 && totals.settledAmount > 0) {
      toast.error('Please allocate the full amount to bills or adjust kasar');
      return;
    }

    setIsLoading(true);
    try {
      const customer = customers.find((c) => c.value === customerCode);
      // Generate voucher number
      const allPayments = (await fetchPayments()) as any[];
      const receiptNums = allPayments
        .filter((p: any) => p.type === 'receipt')
        .map((p: any) => parseInt(p.voucherNumber?.replace(/\D/g, '') || '0'))
        .filter((n: number) => !isNaN(n));
      const nextNum = receiptNums.length > 0 ? Math.max(...receiptNums) + 1 : 1;
      const voucherNumber = `RV-${String(nextNum).padStart(4, '0')}`;

      await createPayment({
        voucherNumber,
        type: 'receipt',
        voucherDate: receiptDate,
        partyType: 'Customer',
        partyCode: customerCode,
        partyName: customer?.label?.split(' - ')[1] || customerCode,
        amount: parseFloat(totalAmount),
        paymentMode,
        reference,
        kasar: parseFloat(kasar) || 0,
        narration,
        settlements: settlements
          .filter((s) => s.settlingAmount > 0)
          .map((s) => ({
            billNumber: s.billNumber,
            billDate: s.date,
            billAmount: s.billAmount,
            settlingAmount: s.settlingAmount,
          })),
        customerId: customerCode,
      } as any);
      toast.success('Receipt saved successfully!');
      router.push('/vendor/cashbook');
    } catch (error: any) {
      console.error('Failed to save receipt:', error);
      toast.error(error?.message || 'Failed to save receipt');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/vendor/cashbook">
            <Button variant="ghost" size="sm">
              <FiArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Receipt</h1>
          <Badge variant="success" size="lg">
            Customer Payment
          </Badge>
        </div>
        <Button leftIcon={<FiSave />} onClick={handleSave} isLoading={isLoading}>
          Save Receipt
        </Button>
      </div>

      {/* Receipt Details */}
      <Card>
        <CardHeader title="Receipt Details" subtitle="Enter payment received from customer" />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Receipt Date"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
            />
            <Input
              label="Voucher Number"
              value="Auto-generated"
              disabled
              helperText="Will be generated on save"
            />
            <Select
              label="Customer"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              options={[{ value: '', label: 'Select Customer' }, ...customers]}
              required
            />
          </div>

          {selectedCustomer && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Outstanding Balance:{' '}
                <span className="font-bold text-blue-600">
                  ₹{selectedCustomer.balance.toLocaleString()}
                </span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={modeOptions}
            />
            {paymentMode !== 'Cash' && (
              <Input
                label="Reference Number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Cheque/UTR/Transaction ID"
              />
            )}
            <Input
              label="Total Amount Received"
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              min="0"
              required
            />
          </div>

          <Input
            label="Narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Payment notes or remarks"
          />
        </div>
      </Card>

      {/* Bill-wise Settlement */}
      {customerCode && settlements.length > 0 && (
        <Card>
          <CardHeader
            title="Bill-wise Settlement"
            subtitle="Allocate received amount against pending bills"
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={clearSettlements}>
                  Clear All
                </Button>
                <Button size="sm" onClick={autoAllocate}>
                  Auto Allocate
                </Button>
              </div>
            }
          />
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Bill Number</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Bill Amount</th>
                    <th className="px-4 py-2 text-right">Pending</th>
                    <th className="px-4 py-2 text-right">Settling Now</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {settlements.map((settlement) => (
                    <tr key={settlement.billNumber}>
                      <td className="px-4 py-2 font-medium">{settlement.billNumber}</td>
                      <td className="px-4 py-2">{settlement.date}</td>
                      <td className="px-4 py-2 text-right">
                        ₹{settlement.billAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-orange-500 font-medium">
                        ₹{settlement.balance.toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={settlement.settlingAmount || ''}
                          onChange={(e) =>
                            updateSettlement(
                              settlement.billNumber,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 px-2 py-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600"
                          max={settlement.balance}
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateSettlement(settlement.billNumber, settlement.balance)
                          }
                        >
                          Full
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Kasar (Discount/Adjustment) */}
      {customerCode && (
        <Card>
          <CardHeader
            title="Kasar / Adjustment"
            subtitle="Any discount or adjustment to be given"
          />
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Kasar Amount"
                type="number"
                value={kasar}
                onChange={(e) => setKasar(e.target.value)}
                min="0"
                helperText="Discount/adjustment amount (if any)"
              />
              <div className="flex items-end text-sm text-gray-500">
                This amount will be written off as discount
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      {customerCode && totals.totalReceived > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader title="Receipt Summary" />
          <div className="p-4 border-t border-green-200 dark:border-green-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Amount Received</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{totals.totalReceived.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Against Bills</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{totals.settledAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Kasar</p>
                <p className="text-2xl font-bold text-orange-500">
                  ₹{totals.kasarAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Unallocated</p>
                <p
                  className={`text-2xl font-bold ${
                    totals.unallocated === 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  ₹{totals.unallocated.toLocaleString()}
                </p>
              </div>
            </div>
            {totals.unallocated !== 0 && (
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
                {totals.unallocated > 0
                  ? 'Unallocated amount will be kept as advance'
                  : 'Allocated amount exceeds received amount'}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
