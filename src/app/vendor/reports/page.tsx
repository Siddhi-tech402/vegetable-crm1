'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiDownload,
  FiUsers,
  FiTruck,
  FiShoppingBag,
  FiDollarSign,
  FiCalendar,
  FiFileText,
  FiPieChart,
} from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Input, Select, Badge } from '@/components/ui';
import {
  generateCustomerBalanceReportPDF,
  generateFarmerPayableReportPDF,
} from '@/lib/pdf';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchCustomers, fetchFarmers, fetchSalesBills } from '@/lib/onlineService';

type ReportType = 'customer-balance' | 'farmer-payable' | 'daily-sales' | 'vegetable-wise' | null;

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);

  // Live data from IndexedDB
  const [customerBalanceReport, setCustomerBalanceReport] = useState<any[]>([]);
  const [farmerPayableReport, setFarmerPayableReport] = useState<any[]>([]);
  const [dailySalesReport, setDailySalesReport] = useState<any[]>([]);
  const [vegetableWiseReport, setVegetableWiseReport] = useState<any[]>([]);

  // ── Load report data from IndexedDB ─────────────────────────────
  const loadReportData = useCallback(async () => {
    try {
      // Customer balance report
      const allCustomers = await fetchCustomers();
      const customerReport = allCustomers.map((c: any) => ({
        code: c.code,
        name: c.name,
        totalBilled: c.currentBalance || 0,
        received: c.balanceType === 'Dr' ? 0 : c.currentBalance || 0,
        balance: c.balanceType === 'Dr' ? c.currentBalance || 0 : 0,
      }));
      setCustomerBalanceReport(customerReport);

      // Farmer payable report
      const allFarmers = await fetchFarmers();
      const farmerReport = allFarmers.map((f: any) => ({
        code: f.code,
        name: f.name,
        totalSales: f.currentBalance || 0,
        paid: f.balanceType === 'Cr' ? 0 : f.currentBalance || 0,
        payable: f.balanceType === 'Cr' ? f.currentBalance || 0 : 0,
      }));
      setFarmerPayableReport(farmerReport);

      // Daily sales report
      const allBills = await fetchSalesBills();
      const dailyMap = new Map<string, any>();
      allBills
        .filter((b: any) => b.billDate >= dateFrom && b.billDate <= dateTo)
        .forEach((b: any) => {
          const date = b.billDate;
          const existing = dailyMap.get(date) || {
            date,
            bills: 0,
            farmers: new Set(),
            totalQty: 0,
            grossAmount: 0,
            netPayable: 0,
          };
          existing.bills++;
          existing.farmers.add(b.farmerCode || b.farmerId);
          existing.grossAmount += b.totalSaleAmount || 0;
          existing.netPayable += b.netPayableToFarmer || 0;
          // Sum qty from buyers
          (b.buyers || []).forEach((buyer: any) => {
            (buyer.items || []).forEach((item: any) => {
              existing.totalQty += item.qty || 0;
            });
          });
          dailyMap.set(date, existing);
        });
      const dailyReport = Array.from(dailyMap.values())
        .map((d) => ({ ...d, farmers: d.farmers.size }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setDailySalesReport(dailyReport);

      // Vegetable-wise report
      const vegMap = new Map<string, any>();
      allBills
        .filter((b: any) => b.billDate >= dateFrom && b.billDate <= dateTo)
        .forEach((b: any) => {
          (b.buyers || []).forEach((buyer: any) => {
            (buyer.items || []).forEach((item: any) => {
              const name = item.vegetableName || item.vegetableCode || 'Unknown';
              const existing = vegMap.get(name) || {
                name,
                totalQty: 0,
                totalAmount: 0,
                avgRate: 0,
              };
              existing.totalQty += item.qty || 0;
              existing.totalAmount += item.amount || 0;
              vegMap.set(name, existing);
            });
          });
        });
      const vegReport = Array.from(vegMap.values()).map((v) => ({
        ...v,
        avgRate: v.totalQty > 0 ? Math.round(v.totalAmount / v.totalQty) : 0,
      }));
      setVegetableWiseReport(vegReport);
    } catch (error) {
      console.error('Failed to load report data:', error);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const reportTypes = [
    {
      id: 'customer-balance' as ReportType,
      title: 'Customer Balance Report',
      description: 'Outstanding receivables from customers',
      icon: FiUsers,
      color: 'blue',
    },
    {
      id: 'farmer-payable' as ReportType,
      title: 'Farmer Payable Report',
      description: 'Pending payments to farmers',
      icon: FiTruck,
      color: 'green',
    },
    {
      id: 'daily-sales' as ReportType,
      title: 'Daily Sales Report',
      description: 'Day-wise sales summary',
      icon: FiCalendar,
      color: 'purple',
    },
    {
      id: 'vegetable-wise' as ReportType,
      title: 'Vegetable-wise Report',
      description: 'Sales by vegetable type',
      icon: FiShoppingBag,
      color: 'orange',
    },
  ];

  const handleExportPDF = () => {
    setIsLoading(true);
    try {
      const dateRange = {
        from: format(new Date(dateFrom), 'dd MMM yyyy'),
        to: format(new Date(dateTo), 'dd MMM yyyy'),
      };

      switch (selectedReport) {
        case 'customer-balance':
          generateCustomerBalanceReportPDF(
            customerBalanceReport.map((r) => ({
              code: r.code,
              name: r.name,
              totalBilled: r.totalBilled,
              received: r.received,
              balance: r.balance,
            })),
            dateRange
          );
          break;
        case 'farmer-payable':
          generateFarmerPayableReportPDF(
            farmerPayableReport.map((r) => ({
              code: r.code,
              name: r.name,
              totalSales: r.totalSales,
              paid: r.paid,
              payable: r.payable,
            })),
            dateRange
          );
          break;
        case 'daily-sales': {
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.setTextColor(16, 185, 129);
          doc.text('VEGETABLE CRM', 105, 15, { align: 'center' });
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text('Daily Sales Report', 105, 25, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 105, 32, { align: 'center' });

          const salesTotals = dailySalesReport.reduce(
            (acc, r) => ({
              bills: acc.bills + r.bills,
              totalQty: acc.totalQty + r.totalQty,
              grossAmount: acc.grossAmount + r.grossAmount,
              netPayable: acc.netPayable + r.netPayable,
            }),
            { bills: 0, totalQty: 0, grossAmount: 0, netPayable: 0 }
          );

          autoTable(doc, {
            startY: 45,
            head: [['Date', 'Bills', 'Farmers', 'Total Qty', 'Gross Amount', 'Net Payable']],
            body: dailySalesReport.map((r) => [
              format(new Date(r.date), 'dd MMM yyyy'),
              r.bills.toString(),
              r.farmers.toString(),
              `${r.totalQty} kg`,
              `₹${r.grossAmount.toLocaleString()}`,
              `₹${r.netPayable.toLocaleString()}`,
            ]),
            foot: [['Total', salesTotals.bills.toString(), '-', `${salesTotals.totalQty} kg`, `₹${salesTotals.grossAmount.toLocaleString()}`, `₹${salesTotals.netPayable.toLocaleString()}`]],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { left: 14, right: 14 },
          });
          doc.save(`daily-sales-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
          break;
        }
        case 'vegetable-wise': {
          const doc2 = new jsPDF();
          doc2.setFontSize(18);
          doc2.setTextColor(16, 185, 129);
          doc2.text('VEGETABLE CRM', 105, 15, { align: 'center' });
          doc2.setFontSize(14);
          doc2.setTextColor(0, 0, 0);
          doc2.text('Vegetable-wise Report', 105, 25, { align: 'center' });
          doc2.setFontSize(10);
          doc2.text(`Period: ${dateRange.from} to ${dateRange.to}`, 105, 32, { align: 'center' });

          const vegTotals2 = vegetableWiseReport.reduce(
            (acc, r) => ({ totalQty: acc.totalQty + r.totalQty, totalAmount: acc.totalAmount + r.totalAmount }),
            { totalQty: 0, totalAmount: 0 }
          );

          autoTable(doc2, {
            startY: 45,
            head: [['Vegetable', 'Total Qty', 'Total Amount', 'Avg. Rate']],
            body: vegetableWiseReport.map((r) => [
              r.name,
              `${r.totalQty} kg`,
              `₹${r.totalAmount.toLocaleString()}`,
              `₹${r.avgRate}/kg`,
            ]),
            foot: [['Total', `${vegTotals2.totalQty} kg`, `₹${vegTotals2.totalAmount.toLocaleString()}`, '-']],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { left: 14, right: 14 },
          });
          doc2.save(`vegetable-wise-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
          break;
        }
      }
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    setIsLoading(true);
    try {
      let csvContent = '';
      let fileName = '';

      switch (selectedReport) {
        case 'customer-balance':
          csvContent = 'Code,Customer Name,Total Billed,Received,Balance\n';
          customerBalanceReport.forEach((r) => {
            csvContent += `${r.code},"${r.name}",${r.totalBilled},${r.received},${r.balance}\n`;
          });
          fileName = `customer-balance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        case 'farmer-payable':
          csvContent = 'Code,Farmer Name,Total Sales,Paid,Payable\n';
          farmerPayableReport.forEach((r) => {
            csvContent += `${r.code},"${r.name}",${r.totalSales},${r.paid},${r.payable}\n`;
          });
          fileName = `farmer-payable-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        case 'daily-sales':
          csvContent = 'Date,Bills,Farmers,Total Qty (kg),Gross Amount,Net Payable\n';
          dailySalesReport.forEach((r) => {
            csvContent += `${format(new Date(r.date), 'dd/MM/yyyy')},${r.bills},${r.farmers},${r.totalQty},${r.grossAmount},${r.netPayable}\n`;
          });
          fileName = `daily-sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        case 'vegetable-wise':
          csvContent = 'Vegetable,Total Qty (kg),Total Amount,Avg Rate\n';
          vegetableWiseReport.forEach((r) => {
            csvContent += `"${r.name}",${r.totalQty},${r.totalAmount},${r.avgRate}\n`;
          });
          fileName = `vegetable-wise-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
      }

      if (csvContent && fileName) {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Excel/CSV downloaded successfully!');
      }
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to generate Excel file');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotals = () => {
    switch (selectedReport) {
      case 'customer-balance':
        return customerBalanceReport.reduce(
          (acc, row) => ({
            totalBilled: acc.totalBilled + row.totalBilled,
            received: acc.received + row.received,
            balance: acc.balance + row.balance,
          }),
          { totalBilled: 0, received: 0, balance: 0 }
        );
      case 'farmer-payable':
        return farmerPayableReport.reduce(
          (acc, row) => ({
            totalSales: acc.totalSales + row.totalSales,
            paid: acc.paid + row.paid,
            payable: acc.payable + row.payable,
          }),
          { totalSales: 0, paid: 0, payable: 0 }
        );
      case 'daily-sales':
        return dailySalesReport.reduce(
          (acc, row) => ({
            bills: acc.bills + row.bills,
            totalQty: acc.totalQty + row.totalQty,
            grossAmount: acc.grossAmount + row.grossAmount,
            netPayable: acc.netPayable + row.netPayable,
          }),
          { bills: 0, totalQty: 0, grossAmount: 0, netPayable: 0 }
        );
      case 'vegetable-wise':
        return vegetableWiseReport.reduce(
          (acc, row) => ({
            totalQty: acc.totalQty + row.totalQty,
            totalAmount: acc.totalAmount + row.totalAmount,
          }),
          { totalQty: 0, totalAmount: 0 }
        );
      default:
        return null;
    }
  };

  const renderReportTable = () => {
    switch (selectedReport) {
      case 'customer-balance':
        const customerTotals = getTotals() as { totalBilled: number; received: number; balance: number };
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Customer Name</th>
                  <th className="px-4 py-3 text-right">Total Billed</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {customerBalanceReport.map((row) => (
                  <tr key={row.code} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">{row.code}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 text-right">₹{row.totalBilled.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      ₹{row.received.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-500">
                      ₹{row.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-600 font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{customerTotals.totalBilled.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    ₹{customerTotals.received.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-500">
                    ₹{customerTotals.balance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      case 'farmer-payable':
        const farmerTotals = getTotals() as { totalSales: number; paid: number; payable: number };
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Farmer Name</th>
                  <th className="px-4 py-3 text-right">Total Sales</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {farmerPayableReport.map((row) => (
                  <tr key={row.code} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">{row.code}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 text-right">₹{row.totalSales.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      ₹{row.paid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">
                      ₹{row.payable.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-600 font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{farmerTotals.totalSales.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    ₹{farmerTotals.paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">
                    ₹{farmerTotals.payable.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      case 'daily-sales':
        const salesTotals = getTotals() as { bills: number; totalQty: number; grossAmount: number; netPayable: number };
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Bills</th>
                  <th className="px-4 py-3 text-center">Farmers</th>
                  <th className="px-4 py-3 text-right">Total Qty</th>
                  <th className="px-4 py-3 text-right">Gross Amount</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dailySalesReport.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">
                      {format(new Date(row.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="info">{row.bills}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">{row.farmers}</td>
                    <td className="px-4 py-3 text-right">{row.totalQty} kg</td>
                    <td className="px-4 py-3 text-right">₹{row.grossAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      ₹{row.netPayable.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-600 font-bold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-center">{salesTotals.bills}</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-right">{salesTotals.totalQty} kg</td>
                  <td className="px-4 py-3 text-right">
                    ₹{salesTotals.grossAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    ₹{salesTotals.netPayable.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      case 'vegetable-wise':
        const vegTotals = getTotals() as { totalQty: number; totalAmount: number };
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Vegetable</th>
                  <th className="px-4 py-3 text-right">Total Qty</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Avg. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {vegetableWiseReport.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-right">{row.totalQty} kg</td>
                    <td className="px-4 py-3 text-right">₹{row.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">₹{row.avgRate}/kg</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-600 font-bold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{vegTotals.totalQty} kg</td>
                  <td className="px-4 py-3 text-right">₹{vegTotals.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && <Badge variant="success">Selected</Badge>}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{report.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
            </button>
          );
        })}
      </div>

      {/* Date Filters */}
      {selectedReport && (
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="flex items-end gap-2 md:col-span-2">
                <Button
                  leftIcon={<FiDownload />}
                  onClick={handleExportPDF}
                  isLoading={isLoading}
                >
                  Export PDF
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<FiFileText />}
                  onClick={handleExportExcel}
                  isLoading={isLoading}
                >
                  Export Excel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Report Table */}
      {selectedReport && (
        <Card>
          <CardHeader
            title={reportTypes.find((r) => r.id === selectedReport)?.title || ''}
            subtitle={`Period: ${format(new Date(dateFrom), 'dd MMM yyyy')} to ${format(
              new Date(dateTo),
              'dd MMM yyyy'
            )}`}
          />
          <div className="border-t border-gray-200 dark:border-gray-700">
            {renderReportTable()}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!selectedReport && (
        <Card>
          <div className="p-12 text-center">
            <FiPieChart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Select a Report
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose a report type from above to view the data
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
