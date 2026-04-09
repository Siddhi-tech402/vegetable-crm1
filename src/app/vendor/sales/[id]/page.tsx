'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiPrinter, FiEdit2, FiDollarSign, FiDownload } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardHeader, Badge, Button } from '@/components/ui';
import { generateSalesBillPDF } from '@/lib/pdf';
import { fetchSalesBills, fetchPayments } from '@/lib/onlineService';
import type { SalesBill } from '@/types';

interface BillDisplay {
  id: string;
  billNumber: string;
  billDate: string;
  farmerCode: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  status: string;
  financialYear: string;
  createdAt: string;
  buyers: {
    id: string;
    customerCode: string;
    customerName: string;
    commissionRate: number;
    hamaliCharge: number;
    marketFeeRate: number;
    items: { id: string; vegetableName: string; unit: string; qty: number; rate: number; amount: number }[];
    grossAmount: number;
    commission: number;
    hamali: number;
    marketFee: number;
    totalDeductions: number;
    netAmount: number;
  }[];
  totals: {
    totalQty: number;
    grossAmount: number;
    totalCommission: number;
    totalHamali: number;
    totalMarketFee: number;
    totalDeductions: number;
    netPayable: number;
  };
  payments: any[];
  paidAmount: number;
  balanceAmount: number;
}

export default function SalesBillDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [bill, setBill] = useState<BillDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const allBills = await fetchSalesBills();
        const billId = params.id as string;
        const found = (allBills as any[]).find(
          (b: any) => b._id === billId || b.localId === billId || b.id === billId
        );

        if (found) {
          // Calculate totals from buyers if not present
          const buyers = (found.buyers || []).map((buyer: any, idx: number) => {
            const items = (buyer.items || []).map((item: any, iIdx: number) => ({
              id: item.id || String(iIdx + 1),
              vegetableName: item.vegetableName || '',
              unit: item.unit || 'kg',
              qty: item.qty || 0,
              rate: item.rate || 0,
              amount: item.amount || item.qty * item.rate || 0,
            }));
            const grossAmount = buyer.grossAmount || items.reduce((s: number, i: any) => s + i.amount, 0);
            const commission = buyer.commission || grossAmount * (buyer.commissionRate || 0) / 100;
            const hamali = buyer.hamali || (buyer.hamaliCharge || 0) * items.reduce((s: number, i: any) => s + i.qty, 0) / 20;
            const marketFee = buyer.marketFee || grossAmount * (buyer.marketFeeRate || 0) / 100;
            const totalDeductions = buyer.totalDeductions || commission + hamali + marketFee;
            const netAmount = buyer.netAmount || grossAmount - totalDeductions;
            return {
              id: buyer.id || String(idx + 1),
              customerCode: buyer.customerCode || '',
              customerName: buyer.customerName || '',
              commissionRate: buyer.commissionRate || 0,
              hamaliCharge: buyer.hamaliCharge || 0,
              marketFeeRate: buyer.marketFeeRate || 0,
              items,
              grossAmount,
              commission,
              hamali,
              marketFee,
              totalDeductions,
              netAmount,
            };
          });

          const totals = found.totals || {
            totalQty: buyers.reduce((s: number, b: any) => s + b.items.reduce((is: number, i: any) => is + i.qty, 0), 0),
            grossAmount: buyers.reduce((s: number, b: any) => s + b.grossAmount, 0),
            totalCommission: buyers.reduce((s: number, b: any) => s + b.commission, 0),
            totalHamali: buyers.reduce((s: number, b: any) => s + b.hamali, 0),
            totalMarketFee: buyers.reduce((s: number, b: any) => s + b.marketFee, 0),
            totalDeductions: buyers.reduce((s: number, b: any) => s + b.totalDeductions, 0),
            netPayable: buyers.reduce((s: number, b: any) => s + b.netAmount, 0),
          };

          // Load payments for this bill
          const allPayments = (await fetchPayments()) as any[];
          const billPayments = allPayments.filter(
            (p: any) => p.settlements?.some((s: any) => s.billNumber === found.billNumber)
          );
          const paidAmount = found.paidAmount || billPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

          setBill({
            id: found.localId || found._id || found.id || billId,
            billNumber: found.billNumber || '',
            billDate: found.billDate ? String(found.billDate).split('T')[0] : '',
            farmerCode: found.farmerCode || '',
            farmerName: found.farmerName || '',
            farmerPhone: found.farmerPhone || '',
            farmerVillage: found.farmerVillage || '',
            status: found.status || 'pending',
            financialYear: found.financialYear || '',
            createdAt: found.createdAt || '',
            buyers,
            totals,
            payments: billPayments,
            paidAmount,
            balanceAmount: totals.netPayable - paidAmount,
          });
        }
      } catch (error) {
        console.error('Failed to load bill:', error);
        toast.error('Failed to load bill');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBill();
  }, [params.id]);

  const handlePrint = () => {
    if (!bill) return;
    try {
      const billData: SalesBill = {
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        farmerCode: bill.farmerCode,
        farmerName: bill.farmerName,
        buyers: bill.buyers.map((buyer) => ({
          customerCode: buyer.customerCode,
          customerName: buyer.customerName,
          commissionRate: buyer.commissionRate,
          hamaliCharge: buyer.hamaliCharge,
          marketFeeRate: buyer.marketFeeRate,
          items: buyer.items.map((item) => ({
            vegetableCode: item.id,
            vegetableName: item.vegetableName,
            unit: item.unit,
            qty: item.qty,
            rate: item.rate,
            amount: item.amount,
          })),
          grossAmount: buyer.grossAmount,
          commission: buyer.commission,
          hamali: buyer.hamali,
          marketFee: buyer.marketFee,
          totalDeductions: buyer.totalDeductions,
          netAmount: buyer.netAmount,
        })),
        totals: bill.totals,
        paidAmount: bill.paidAmount,
        balanceAmount: bill.balanceAmount,
        status: bill.status as 'pending' | 'partial' | 'settled',
        financialYear: bill.financialYear,
      };
      generateSalesBillPDF(billData);
      toast.success(`PDF downloaded: ${bill.billNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleMakePayment = () => {
    router.push(`/vendor/cashbook/payment?billId=${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Bill not found</p>
        <Link href="/vendor/sales">
          <Button variant="secondary" className="mt-4">
            Back to Sales
          </Button>
        </Link>
      </div>
    );
  }

  const statusVariants: Record<string, 'warning' | 'info' | 'success'> = {
    pending: 'warning',
    partial: 'info',
    settled: 'success',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/vendor/sales">
            <Button variant="ghost" size="sm">
              <FiArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {bill.billNumber}
            </h1>
            <p className="text-sm text-gray-500">
              {format(new Date(bill.billDate), 'dd MMMM yyyy')} • FY {bill.financialYear}
            </p>
          </div>
          <Badge variant={statusVariants[bill.status]} size="lg">
            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<FiDownload />} onClick={handlePrint}>
            Download PDF
          </Button>
          <Button variant="secondary" leftIcon={<FiPrinter />} onClick={handlePrint}>
            Print
          </Button>
          {bill.status !== 'settled' && (
            <Button leftIcon={<FiDollarSign />} onClick={handleMakePayment}>
              Make Payment
            </Button>
          )}
        </div>
      </div>

      {/* Farmer Info & Bill Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Farmer Details" />
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Code</span>
              <span className="font-medium">{bill.farmerCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{bill.farmerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{bill.farmerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Village</span>
              <span className="font-medium">{bill.farmerVillage}</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader title="Payment Summary" />
          <div className="p-4 border-t border-green-200 dark:border-green-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Net Payable</span>
              <span className="text-xl font-bold">₹{bill.totals.netPayable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Paid Amount</span>
              <span className="text-xl font-bold text-green-600">
                ₹{bill.paidAmount.toLocaleString()}
              </span>
            </div>
            <hr className="border-green-200 dark:border-green-700" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Balance</span>
              <span className="text-2xl font-bold text-orange-500">
                ₹{bill.balanceAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Buyers Detail */}
      <Card>
        <CardHeader
          title="Buyers Breakdown"
          subtitle={`${bill.buyers.length} buyer(s) in this bill`}
        />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
          {bill.buyers.map((buyer, index) => (
            <div
              key={buyer.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Buyer Header */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                  <span className="ml-2 font-semibold">{buyer.customerName}</span>
                  <span className="ml-2 text-sm text-gray-500">({buyer.customerCode})</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Net: </span>
                  <span className="font-bold text-green-600">
                    ₹{buyer.netAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Vegetable</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {buyer.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.vegetableName}</td>
                        <td className="px-4 py-2 text-right">
                          {item.qty} {item.unit}
                        </td>
                        <td className="px-4 py-2 text-right">₹{item.rate}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          ₹{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right font-medium">
                        Gross Amount
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        ₹{buyer.grossAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Deductions */}
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  Deductions
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Commission ({buyer.commissionRate}%)</span>
                    <p className="font-medium text-red-600">₹{buyer.commission}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Hamali (₹{buyer.hamaliCharge}/unit)</span>
                    <p className="font-medium text-red-600">₹{buyer.hamali}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Market Fee ({buyer.marketFeeRate}%)</span>
                    <p className="font-medium text-red-600">₹{buyer.marketFee}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Deductions</span>
                    <p className="font-bold text-red-600">₹{buyer.totalDeductions}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Grand Total */}
      <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
        <CardHeader title="Bill Grand Total" />
        <div className="p-4 border-t border-primary-200 dark:border-primary-800">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Qty</p>
              <p className="text-xl font-bold">{bill.totals.totalQty} units</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Gross Amount</p>
              <p className="text-xl font-bold">₹{bill.totals.grossAmount.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Commission</p>
              <p className="text-xl font-bold text-red-500">
                ₹{bill.totals.totalCommission.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">Hamali + Market Fee</p>
              <p className="text-xl font-bold text-red-500">
                ₹{(bill.totals.totalHamali + bill.totals.totalMarketFee).toLocaleString()}
              </p>
            </div>
            <div className="text-center bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">Net Payable</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{bill.totals.netPayable.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader title="Payment History" />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {bill.payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No payments recorded yet</p>
              <Button
                className="mt-4"
                variant="secondary"
                leftIcon={<FiDollarSign />}
                onClick={handleMakePayment}
              >
                Record Payment
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Voucher No.</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Mode</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.payments.map((payment: any) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-2">{payment.voucherNumber}</td>
                    <td className="px-4 py-2">
                      {format(new Date(payment.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-2">{payment.mode}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      ₹{payment.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
