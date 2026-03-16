import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency, formatDate } from './utils';
import type { SalesBill, Payment, CustomerBalanceReport, FarmerPayableReport } from '@/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

/**
 * Generate Sales Bill PDF
 */
export function generateSalesBillPDF(bill: SalesBill): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129); // Primary green
  doc.text('VEGETABLE CRM', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('SALES BILL', 105, 25, { align: 'center' });
  
  // Bill Details
  doc.setFontSize(10);
  doc.text(`Bill No: ${bill.billNumber}`, 14, 40);
  doc.text(`Date: ${formatDate(bill.billDate)}`, 14, 47);
  doc.text(`Financial Year: ${bill.financialYear}`, 14, 54);
  
  // Farmer Details
  doc.text(`Farmer: ${bill.farmerName}`, 120, 40);
  doc.text(`Code: ${bill.farmerCode}`, 120, 47);
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 60, 196, 60);
  
  let currentY = 70;
  
  // Buyers Section
  bill.buyers.forEach((buyer, index) => {
    // Buyer header
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Buyer ${index + 1}: ${buyer.customerName} (${buyer.customerCode})`, 14, currentY);
    currentY += 5;
    
    // Items table
    autoTable(doc, {
      startY: currentY,
      head: [['Vegetable', 'Qty', 'Unit', 'Rate', 'Amount']],
      body: buyer.items.map(item => [
        item.vegetableName,
        item.qty.toString(),
        item.unit,
        formatCurrency(item.rate),
        formatCurrency(item.amount),
      ]),
      foot: [['', '', '', 'Gross:', formatCurrency(buyer.grossAmount)]],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    });
    
    currentY = doc.lastAutoTable.finalY + 5;
    
    // Deductions
    doc.setFontSize(9);
    doc.text(`Commission (${buyer.commissionRate}%): -${formatCurrency(buyer.commission)}`, 120, currentY);
    currentY += 5;
    doc.text(`Hamali: -${formatCurrency(buyer.hamali)}`, 120, currentY);
    currentY += 5;
    doc.text(`Market Fee (${buyer.marketFeeRate}%): -${formatCurrency(buyer.marketFee)}`, 120, currentY);
    currentY += 5;
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text(`Net Amount: ${formatCurrency(buyer.netAmount)}`, 120, currentY);
    doc.setTextColor(0, 0, 0);
    
    currentY += 15;
    
    // Check for page break
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });
  
  // Grand Total Section
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);
  currentY += 10;
  
  doc.setFontSize(12);
  doc.text('BILL SUMMARY', 14, currentY);
  currentY += 10;
  
  const summaryData = [
    ['Total Quantity', `${bill.totals.totalQty} units`],
    ['Gross Amount', formatCurrency(bill.totals.grossAmount)],
    ['Total Commission', `-${formatCurrency(bill.totals.totalCommission)}`],
    ['Total Hamali', `-${formatCurrency(bill.totals.totalHamali)}`],
    ['Total Market Fee', `-${formatCurrency(bill.totals.totalMarketFee)}`],
    ['Total Deductions', `-${formatCurrency(bill.totals.totalDeductions)}`],
  ];
  
  autoTable(doc, {
    startY: currentY,
    body: summaryData,
    theme: 'plain',
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
    margin: { left: 100, right: 14 },
  });
  
  currentY = doc.lastAutoTable.finalY + 5;
  
  // Net Payable
  doc.setFillColor(16, 185, 129);
  doc.rect(100, currentY, 96, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Net Payable to Farmer:', 105, currentY + 8);
  doc.text(formatCurrency(bill.totals.netPayable), 191, currentY + 8, { align: 'right' });
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 285, { align: 'center' });
  
  // Save
  doc.save(`${bill.billNumber}.pdf`);
}

/**
 * Generate Payment Receipt/Voucher PDF
 */
export function generatePaymentPDF(payment: Payment): void {
  const doc = new jsPDF();
  
  const isReceipt = payment.type === 'receipt';
  const title = isReceipt ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER';
  const color = isReceipt ? [16, 185, 129] : [239, 68, 68]; // Green for receipt, Red for payment
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text('VEGETABLE CRM', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 105, 25, { align: 'center' });
  
  // Voucher Details
  doc.setFontSize(10);
  doc.text(`Voucher No: ${payment.voucherNumber}`, 14, 45);
  doc.text(`Date: ${formatDate(payment.date)}`, 14, 52);
  doc.text(`Mode: ${payment.mode}`, 14, 59);
  if (payment.reference) {
    doc.text(`Reference: ${payment.reference}`, 14, 66);
  }
  
  // Party Details
  doc.text(`${payment.partyType}: ${payment.partyName}`, 120, 45);
  doc.text(`Code: ${payment.partyCode}`, 120, 52);
  
  // Amount Box
  const amountY = 80;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(14, amountY, 182, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(isReceipt ? 'Amount Received:' : 'Amount Paid:', 20, amountY + 13);
  doc.setFontSize(16);
  doc.text(formatCurrency(payment.amount), 190, amountY + 13, { align: 'right' });
  
  // Settlements
  if (payment.settlements && payment.settlements.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('Bill-wise Settlement:', 14, amountY + 35);
    
    autoTable(doc, {
      startY: amountY + 40,
      head: [['Bill Number', 'Bill Date', 'Amount Settled']],
      body: payment.settlements.map(s => [
        s.billNumber,
        s.billDate,
        formatCurrency(s.settlingAmount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100] },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Kasar
  if (payment.kasar && payment.kasar > 0) {
    const kasarY = payment.settlements ? doc.lastAutoTable.finalY + 10 : amountY + 35;
    doc.setFontSize(10);
    doc.text(`Kasar/Adjustment: ${formatCurrency(payment.kasar)}`, 14, kasarY);
  }
  
  // Narration
  if (payment.narration) {
    const narrationY = (payment.settlements ? doc.lastAutoTable.finalY : amountY) + 20;
    doc.setFontSize(10);
    doc.text(`Narration: ${payment.narration}`, 14, narrationY);
  }
  
  // Signatures
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Received By: ________________', 14, 250);
  doc.text('Authorized Signature: ________________', 120, 250);
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 285, { align: 'center' });
  
  // Save
  doc.save(`${payment.voucherNumber}.pdf`);
}

/**
 * Generate Customer Balance Report PDF
 */
export function generateCustomerBalanceReportPDF(
  data: CustomerBalanceReport[],
  dateRange: { from: string; to: string }
): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('VEGETABLE CRM', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Customer Balance Report', 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 105, 32, { align: 'center' });
  
  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      totalBilled: acc.totalBilled + row.totalBilled,
      received: acc.received + row.received,
      balance: acc.balance + row.balance,
    }),
    { totalBilled: 0, received: 0, balance: 0 }
  );
  
  // Table
  autoTable(doc, {
    startY: 45,
    head: [['Code', 'Customer Name', 'Total Billed', 'Received', 'Balance']],
    body: data.map(row => [
      row.code,
      row.name,
      formatCurrency(row.totalBilled),
      formatCurrency(row.received),
      formatCurrency(row.balance),
    ]),
    foot: [[
      '',
      'TOTAL',
      formatCurrency(totals.totalBilled),
      formatCurrency(totals.received),
      formatCurrency(totals.balance),
    ]],
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 285, { align: 'center' });
  
  // Save
  doc.save(`customer-balance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

/**
 * Generate Farmer Payable Report PDF
 */
export function generateFarmerPayableReportPDF(
  data: FarmerPayableReport[],
  dateRange: { from: string; to: string }
): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text('VEGETABLE CRM', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Farmer Payable Report', 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 105, 32, { align: 'center' });
  
  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      totalSales: acc.totalSales + row.totalSales,
      paid: acc.paid + row.paid,
      payable: acc.payable + row.payable,
    }),
    { totalSales: 0, paid: 0, payable: 0 }
  );
  
  // Table
  autoTable(doc, {
    startY: 45,
    head: [['Code', 'Farmer Name', 'Total Sales', 'Paid', 'Payable']],
    body: data.map(row => [
      row.code,
      row.name,
      formatCurrency(row.totalSales),
      formatCurrency(row.paid),
      formatCurrency(row.payable),
    ]),
    foot: [[
      '',
      'TOTAL',
      formatCurrency(totals.totalSales),
      formatCurrency(totals.paid),
      formatCurrency(totals.payable),
    ]],
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 285, { align: 'center' });
  
  // Save
  doc.save(`farmer-payable-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
