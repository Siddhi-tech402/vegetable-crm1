'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Input, Select, Badge } from '@/components/ui';
import { fetchFarmers, fetchSalesBills, fetchPayments, createPayment } from '@/lib/onlineService';

const modeOptions = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cheque', label: 'Cheque' },
];

interface FarmerOption {
  value: string;
  label: string;
  balance: number;
}

interface PendingBill {
  billNumber: string;
  date: string;
  netPayable: number;
  balance: number;
}

interface BillSettlement {
  billNumber: string;
  date: string;
  netPayable: number;
  balance: number;
  settlingAmount: number;
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <NewPaymentContent />
    </Suspense>
  );
}

function NewPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Master data from offline stores
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [pendingBills, setPendingBills] = useState<Record<string, PendingBill[]>>({});

  // Pre-fill from query params
  const prefilledBillId = searchParams.get('billId');

  // Form state
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [farmerCode, setFarmerCode] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [kasar, setKasar] = useState('');
  const [narration, setNarration] = useState('');

  // Bill settlements
  const [settlements, setSettlements] = useState<BillSettlement[]>([]);

  // Load farmers and pending bills
  const loadData = useCallback(async () => {
    try {
      const [farmersData, billsData, paymentsData] = await Promise.all([
        fetchFarmers(),
        fetchSalesBills(),
        fetchPayments(),
      ]);

      // Build farmer options with payable balance
      const farmerOptions: FarmerOption[] = (farmersData as any[]).map((f: any) => {
        // Calculate balance from unpaid bills for this farmer
        const farmerBills = (billsData as any[]).filter((b: any) => b.farmerCode === f.code);
        const totalPayable = farmerBills.reduce((s: number, b: any) => {
          const net = b.totals?.netPayable || b.netPayableToFarmer || 0;
          return s + net;
        }, 0);
        const totalPaid = (paymentsData as any[])
          .filter((p: any) => p.partyCode === f.code && p.type === 'payment')
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);
        return {
          value: f.code,
          label: `${f.code} - ${f.name}`,
          balance: totalPayable - totalPaid,
        };
      });
      setFarmers(farmerOptions);

      // Build pending bills grouped by farmer code
      const billsByFarmer: Record<string, PendingBill[]> = {};
      for (const bill of billsData as any[]) {
        if (bill.status === 'settled') continue;
        const code = bill.farmerCode;
        if (!code) continue;
        const netPayable = bill.totals?.netPayable || bill.netPayableToFarmer || 0;
        const paidAmount = bill.paidAmount || 0;
        const balance = netPayable - paidAmount;
        if (balance <= 0) continue;
        if (!billsByFarmer[code]) billsByFarmer[code] = [];
        billsByFarmer[code].push({
          billNumber: bill.billNumber,
          date: bill.billDate ? String(bill.billDate).split('T')[0] : '',
          netPayable,
          balance,
        });
      }
      setPendingBills(billsByFarmer);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle prefilled bill
  useEffect(() => {
    if (prefilledBillId && farmers.length > 0) {
      // Find which farmer owns this bill
      for (const [code, bills] of Object.entries(pendingBills)) {
        if (bills.some((b) => b.billNumber === prefilledBillId)) {
          setFarmerCode(code);
          break;
        }
      }
    }
  }, [prefilledBillId, farmers, pendingBills]);

  // Get farmer bills when farmer changes
  useEffect(() => {
    if (farmerCode && pendingBills[farmerCode]) {
      setSettlements(
        pendingBills[farmerCode].map((bill) => ({
          billNumber: bill.billNumber,
          date: bill.date,
          netPayable: bill.netPayable,
          balance: bill.balance,
          settlingAmount: prefilledBillId && bill.billNumber === prefilledBillId ? bill.balance : 0,
        }))
      );
    } else {
      setSettlements([]);
    }
  }, [farmerCode, prefilledBillId, pendingBills]);

  // Calculate totals
  const totals = useMemo(() => {
    const settledAmount = settlements.reduce((sum, s) => sum + (s.settlingAmount || 0), 0);
    const kasarAmount = parseFloat(kasar) || 0;
    const totalPaying = parseFloat(totalAmount) || 0;
    const difference = totalPaying + kasarAmount - settledAmount;

    return {
      settledAmount,
      kasarAmount,
      totalPaying,
      difference,
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

  // Auto-fill amount based on settlements
  const calculateTotal = () => {
    const total = totals.settledAmount - totals.kasarAmount;
    setTotalAmount(Math.max(0, total).toString());
  };

  // Settle all bills
  const settleAll = () => {
    setSettlements((prev) => prev.map((s) => ({ ...s, settlingAmount: s.balance })));
  };

  // Clear all settlements
  const clearSettlements = () => {
    setSettlements((prev) => prev.map((s) => ({ ...s, settlingAmount: 0 })));
  };

  // Get selected farmer info
  const selectedFarmer = farmers.find((f) => f.value === farmerCode);

  // Save payment
  const handleSave = async () => {
    if (!farmerCode) {
      toast.error('Please select a farmer');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (totals.difference < 0) {
      toast.error('Settled amount cannot exceed your actual cash payment + Kasar.');
      return;
    }

    setIsLoading(true);
    try {
      const farmer = farmers.find((f) => f.value === farmerCode);
      // Generate voucher number
      const allPayments = (await fetchPayments()) as any[];
      const paymentNums = allPayments
        .filter((p: any) => p.type === 'payment')
        .map((p: any) => parseInt(p.voucherNumber?.replace(/\D/g, '') || '0'))
        .filter((n: number) => !isNaN(n));
      const nextNum = paymentNums.length > 0 ? Math.max(...paymentNums) + 1 : 1;
      const voucherNumber = `PV-${String(nextNum).padStart(4, '0')}`;

      await createPayment({
        voucherNumber,
        type: 'payment',
        voucherDate: paymentDate,
        partyType: 'Farmer',
        partyCode: farmerCode,
        partyName: farmer?.label?.split(' - ')[1] || farmerCode,
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
            billAmount: s.netPayable,
            settlingAmount: s.settlingAmount,
          })),
        farmerId: farmerCode,
      } as any);
      toast.success('Payment saved successfully!');
      router.push('/vendor/cashbook');
    } catch (error: any) {
      console.error('Failed to save payment:', error);
      toast.error(error?.message || 'Failed to save payment');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Payment</h1>
          <Badge variant="danger" size="lg">
            Farmer Settlement
          </Badge>
        </div>
        <Button leftIcon={<FiSave />} onClick={handleSave} isLoading={isLoading}>
          Save Payment
        </Button>
      </div>

      {/* Payment Details */}
      <Card>
        <CardHeader title="Payment Details" subtitle="Enter payment to farmer" />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
            <Input
              label="Voucher Number"
              value="Auto-generated"
              disabled
              helperText="Will be generated on save"
            />
            <Select
              label="Farmer"
              value={farmerCode}
              onChange={(e) => setFarmerCode(e.target.value)}
              options={[{ value: '', label: 'Select Farmer' }, ...farmers]}
              required
            />
          </div>

          {selectedFarmer && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Payable Balance:{' '}
                <span className="font-bold text-orange-600">
                  ₹{selectedFarmer.balance.toLocaleString()}
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
              label="Payment Amount"
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
      {farmerCode && settlements.length > 0 && (
        <Card>
          <CardHeader
            title="Bill-wise Settlement"
            subtitle="Select bills to settle with this payment"
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={clearSettlements}>
                  Clear All
                </Button>
                <Button size="sm" variant="secondary" onClick={settleAll}>
                  Settle All
                </Button>
                <Button size="sm" onClick={calculateTotal}>
                  Calculate Amount
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
                    <th className="px-4 py-2 text-right">Net Payable</th>
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
                        ₹{settlement.netPayable.toLocaleString()}
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
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-medium">
                      Total Settling Amount
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-primary-600">
                      ₹{totals.settledAmount.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Kasar (Adjustment) */}
      {farmerCode && (
        <Card>
          <CardHeader
            title="Kasar / Adjustment"
            subtitle="Any deduction or adjustment from payment"
          />
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Kasar Amount"
                type="number"
                value={kasar}
                onChange={(e) => setKasar(e.target.value)}
                min="0"
                helperText="Amount to deduct from farmer payment"
              />
              <div className="flex items-end text-sm text-gray-500">
                Kasar will reduce the cash payment but still settle the bill amount
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      {farmerCode && totals.settledAmount > 0 && (
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <CardHeader title="Payment Summary" />
          <div className="p-4 border-t border-red-200 dark:border-red-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Bills Settling</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{totals.settledAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Kasar (-)</p>
                <p className="text-2xl font-bold text-orange-500">
                  ₹{totals.kasarAmount.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Cash Paying</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{totals.totalPaying.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Difference</p>
                <p
                  className={`text-2xl font-bold ${
                    totals.difference === 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  ₹{Math.abs(totals.difference).toLocaleString()}
                </p>
              </div>
            </div>
            {totals.difference > 0 && totals.settledAmount > 0 && (
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
                Advance Payment (Unallocated amount added directly to balance): ₹
                {totals.difference.toLocaleString()}
              </div>
            )}
            {totals.difference < 0 && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
                Error: Settled amount exceeds Cash + Kasar by ₹{Math.abs(totals.difference).toLocaleString()}! Please adjust.
              </div>
            )}
            {totals.difference === 0 && totals.settledAmount > 0 && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400 text-sm">
                ✓ Payment is perfectly balanced against settlements and ready to save.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
