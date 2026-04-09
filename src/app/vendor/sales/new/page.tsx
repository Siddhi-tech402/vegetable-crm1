'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiPlus,
  FiTrash2,
  FiSave,
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiShoppingCart,
  FiUser,
  FiMessageCircle,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Input, Select, Modal } from '@/components/ui';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import {
  fetchFarmers,
  fetchCustomers,
  fetchVegetables,
  fetchSalesBills,
  createSalesBill,
} from '@/lib/onlineService';

// ── Types ────────────────────────────────────────────────────────────────

interface ItemInput {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  vegetableCode: string;
  vegetableName: string;
  unit: string;
  weightKg: number;
  pricePer20Kg: number;
  bags: number;
  amount: number;
  salesman?: string;
  def?: string;
}

interface FarmerRecord {
  localId: string;
  _id?: string;
  code: string;
  name: string;
  phone: string;
  [key: string]: any;
}

interface CustomerRecord {
  localId: string;
  _id?: string;
  code: string;
  name: string;
  phone: string;
  commissionRate: number;
  hamaliCharge: number;
  marketFeeRate: number;
  [key: string]: any;
}

interface VegetableRecord {
  localId: string;
  _id?: string;
  code: string;
  name: string;
  unit: string;
  defaultPrice?: number;
  [key: string]: any;
}

// ── Component ────────────────────────────────────────────────────────────

export default function NewSalesBillPage() {
  const router = useRouter();
  const { financialYear } = useFinancialYear();
  const [isLoading, setIsLoading] = useState(false);

  // Master data from offline stores
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [vegetables, setVegetables] = useState<VegetableRecord[]>([]);
  const [existingBills, setExistingBills] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [farmersData, customersData, vegetablesData, billsData] = await Promise.all([
          fetchFarmers(),
          fetchCustomers(),
          fetchVegetables(),
          fetchSalesBills(),
        ]);
        setFarmers((farmersData || []) as any);
        setCustomers((customersData || []) as any);
        setVegetables((vegetablesData || []) as any);
        setExistingBills(billsData as any || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setFarmers([]);
        setCustomers([]);
        setVegetables([]);
        setExistingBills([]);
      }
    };
    loadData();
  }, []);

  // ── Step 1: Bill Details ──────────────────────────────────────────────

  const [formData, setFormData] = useState({
    billNo: '',
    date: new Date().toISOString().split('T')[0],
    farmerId: '',
    vehicleNumber: '',
    bags: 0,
    gatePassNumber: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-generate bill number
  useEffect(() => {
    if (!formData.billNo && existingBills.length >= 0) {
      const nums = existingBills
        .map((b) => parseInt(b.billNumber, 10))
        .filter((n) => !isNaN(n));
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      setFormData((prev) => ({ ...prev, billNo: String(max + 1) }));
    }
  }, [existingBills]);

  const selectedFarmer = farmers.find((f) => (f._id || f.localId) === formData.farmerId);

  // ── Step 2: Items ─────────────────────────────────────────────────────

  const [items, setItems] = useState<ItemInput[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<ItemInput>>({});

  const addItem = useCallback(() => {
    if (!currentItem.customerId || !currentItem.vegetableCode || !currentItem.weightKg || !currentItem.pricePer20Kg) {
      toast.error('Fill: Customer, Vegetable, Weight, and Price');
      return;
    }

    const customer = customers.find((c) => (c._id || c.localId) === currentItem.customerId);
    const vegetable = vegetables.find((v) => v.code === currentItem.vegetableCode);
    if (!customer || !vegetable) {
      toast.error('Customer or vegetable not found');
      return;
    }

    const amount = (currentItem.weightKg * currentItem.pricePer20Kg) / 20;
    const bags = currentItem.bags || 1;

    const newItem: ItemInput = {
      id: Date.now().toString(),
      customerId: customer._id || customer.localId,
      customerCode: customer.code,
      customerName: customer.name,
      vegetableCode: vegetable.code,
      vegetableName: vegetable.name,
      unit: vegetable.unit || 'kg',
      weightKg: currentItem.weightKg,
      pricePer20Kg: currentItem.pricePer20Kg,
      bags,
      amount,
      salesman: currentItem.salesman,
      def: currentItem.def,
    };

    setItems((prev) => [...prev, newItem]);
    // Keep customer & optional fields for quick repeat entry
    setCurrentItem((prev) => ({
      customerId: prev.customerId,
      salesman: prev.salesman,
      def: prev.def,
    }));
    toast.success(`Added: ${vegetable.name} - ${currentItem.weightKg} KG`);
  }, [currentItem, customers, vegetables]);

  const removeItem = useCallback(
    (index: number) => {
      setItems(items.filter((_, i) => i !== index));
      toast.success('Item removed');
    },
    [items]
  );

  // ── Step 3: Charges ───────────────────────────────────────────────────

  const [charges, setCharges] = useState({
    commissionPct: 5,
    transportation: 0,
    localTransportation: 0,
    otherCharges: 0,
  });

  // Totals
  const totalWeight = items.reduce((s, i) => s + i.weightKg, 0);
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const totalBags = items.reduce((s, i) => s + i.bags, 0);

  const commissionAmt = (totalAmount * charges.commissionPct) / 100;
  const totalCharges =
    commissionAmt + charges.transportation + charges.localTransportation + charges.otherCharges;
  const netPayable = totalAmount + totalCharges;

  // Group items by customer for saving and WhatsApp
  const buyerGroups = useMemo(() => {
    const groups: Record<string, ItemInput[]> = {};
    items.forEach((item) => {
      if (!groups[item.customerId]) groups[item.customerId] = [];
      groups[item.customerId].push(item);
    });
    return groups;
  }, [items]);

  // ── WhatsApp Sharing ──────────────────────────────────────────────────

  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [savedBillNo, setSavedBillNo] = useState('');

  const generateWhatsAppMessage = useCallback(
    (customerId: string, customerItems: ItemInput[]) => {
      const customer = customers.find((c) => (c._id || c.localId) === customerId);
      if (!customer) return '';

      const tw = customerItems.reduce((s, i) => s + i.weightKg, 0);
      const ta = customerItems.reduce((s, i) => s + i.amount, 0);

      let msg = `🧾 *Bill No: ${savedBillNo}*\n`;
      msg += `📅 Date: ${new Date(formData.date).toLocaleDateString('en-IN')}\n`;
      msg += `👤 From: ${selectedFarmer?.name || 'Farmer'}\n`;
      msg += `\n━━━━━━━━━━━━━━━━\n`;
      msg += `*Your Items:*\n\n`;

      customerItems.forEach((item, idx) => {
        msg += `${idx + 1}. ${item.vegetableName}\n`;
        msg += `   Weight: ${item.weightKg} KG\n`;
        msg += `   Rate: ₹${item.pricePer20Kg}/20KG\n`;
        msg += `   Amount: ₹${item.amount.toFixed(2)}\n\n`;
      });

      msg += `━━━━━━━━━━━━━━━━\n`;
      msg += `*Total Weight:* ${tw} KG\n`;
      msg += `*Total Amount:* ₹${ta.toFixed(2)}\n`;
      msg += `\nThank you for your business! 🙏`;
      return msg;
    },
    [customers, selectedFarmer, savedBillNo, formData.date]
  );

  const sendWhatsApp = useCallback(
    (customerId: string) => {
      const customer = customers.find((c) => (c._id || c.localId) === customerId);
      if (!customer?.phone) {
        toast.error('Phone number not found');
        return;
      }

      const customerItems = items.filter((i) => i.customerId === customerId);
      const message = generateWhatsAppMessage(customerId, customerItems);
      let phone = customer.phone.replace(/[\s-]/g, '');
      if (!phone.startsWith('+')) phone = `+91${phone}`;
      const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      toast.success(`Opening WhatsApp for ${customer.name}`);
    },
    [customers, items, generateWhatsAppMessage]
  );

  const sendToAll = useCallback(() => {
    const ids = Array.from(new Set(items.map((i) => i.customerId)));
    ids.forEach((id, idx) => {
      setTimeout(() => sendWhatsApp(id), idx * 500);
    });
    toast.success(`Sending bills to ${ids.length} customer(s)`);
  }, [items, sendWhatsApp]);

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData.farmerId) {
      toast.error('Please select a farmer');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsLoading(true);
    try {
      const farmer = selectedFarmer;
      if (!farmer) throw new Error('Farmer not found');

      // Build buyers array from grouped items
      const buyersArr = Object.entries(buyerGroups).map(([custId, custItems]) => {
        const customer = customers.find((c) => (c._id || c.localId) === custId);
        const gross = custItems.reduce((s, i) => s + i.amount, 0);
        const qty = custItems.reduce((s, i) => s + i.weightKg, 0);
        const comm = Math.round((gross * (customer?.commissionRate || 0)) / 100);
        const hamali = Math.round(qty * (customer?.hamaliCharge || 0));
        const mktFee = Math.round((gross * (customer?.marketFeeRate || 0)) / 100);
        const ded = comm + hamali + mktFee;

        return {
          customerCode: customer?.code || '',
          customerName: customer?.name || '',
          commissionRate: customer?.commissionRate || 0,
          hamaliCharge: customer?.hamaliCharge || 0,
          marketFeeRate: customer?.marketFeeRate || 0,
          items: custItems.map((i) => ({
            vegetableCode: i.vegetableCode,
            vegetableName: i.vegetableName,
            unit: i.unit,
            qty: i.weightKg,
            rate: i.pricePer20Kg,
            amount: i.amount,
          })),
          grossAmount: gross,
          commission: comm,
          hamali,
          marketFee: mktFee,
          totalDeductions: ded,
          netAmount: gross - ded,
        };
      });

      const billRecord = {
        billNumber: formData.billNo,
        billDate: formData.date,
        farmerId: farmer._id || farmer.localId,
        farmerName: farmer.name,
        farmerCode: farmer.code,
        buyers: buyersArr,
        vehicleNumber: formData.vehicleNumber || undefined,
        gatePassNumber: formData.gatePassNumber || undefined,
        bags: formData.bags || undefined,
        totalSaleAmount: totalAmount,
        totalCommission: buyersArr.reduce((s, b) => s + b.commission, 0),
        totalMarketFee: buyersArr.reduce((s, b) => s + b.marketFee, 0),
        totalHamali: buyersArr.reduce((s, b) => s + b.hamali, 0),
        totalDeductions: buyersArr.reduce((s, b) => s + b.totalDeductions, 0),
        netPayableToFarmer: netPayable,
        transportation: charges.transportation || undefined,
        localTransportation: charges.localTransportation || undefined,
        otherCharges: charges.otherCharges || undefined,
        financialYear: financialYear,
        status: 'pending',
        paidAmount: 0,
        pendingAmount: netPayable,
        createdBy: 'current-user',
      };

      await createSalesBill(billRecord as any);
      toast.success('Sales bill saved successfully!');
      setSavedBillNo(formData.billNo);
      setShowWhatsApp(true);
    } catch (error: any) {
      console.error('Failed to save bill:', error);
      toast.error(error?.message || 'Failed to save sales bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppClose = () => {
    setShowWhatsApp(false);
    router.push('/vendor/sales');
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/vendor/sales">
            <Button variant="ghost" size="sm">
              <FiArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Sales Bill</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a new auction billing entry
            </p>
          </div>
        </div>
      </div>

      {/* ── Step 1: Bill Details ──────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Step 1: Bill Details"
          subtitle="Select farmer and enter basic details"
        />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              label="Bill No"
              value={formData.billNo}
              onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
              placeholder="Bill number"
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <div className="md:col-span-2">
              <Select
                label="Farmer"
                value={formData.farmerId}
                onChange={(e) => setFormData({ ...formData, farmerId: e.target.value })}
                options={[
                  { value: '', label: 'Select Farmer' },
                  ...farmers
                    .filter((f) => f.isActive !== false)
                    .map((f) => ({ value: f._id || f.localId, label: `${f.code} - ${f.name}` })),
                ]}
                required
              />
            </div>
          </div>

          {/* Collapsible advanced options */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {showAdvanced ? (
                <FiChevronUp className="w-4 h-4" />
              ) : (
                <FiChevronDown className="w-4 h-4" />
              )}
              {showAdvanced ? 'Hide' : 'Show'} additional options (Vehicle, Bags, Gate Pass)
            </button>
            {showAdvanced && (
              <div className="grid gap-4 md:grid-cols-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Input
                  label="Vehicle Number"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  placeholder="e.g., MH-12-AB-1234"
                />
                <Input
                  label="Bags"
                  type="number"
                  value={formData.bags || ''}
                  onChange={(e) => setFormData({ ...formData, bags: parseInt(e.target.value) || 0 })}
                  placeholder="Total bags"
                />
                <Input
                  label="Gate Pass Number"
                  value={formData.gatePassNumber}
                  onChange={(e) => setFormData({ ...formData, gatePassNumber: e.target.value })}
                  placeholder="Gate pass"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Step 2: Add Items ─────────────────────────────────────────── */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardHeader
          title={`Step 2: Add Items${items.length > 0 ? ` (${items.length})` : ''}`}
          subtitle="Customer → Vegetable → Weight → Price → Add"
        />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Quick add form */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="grid gap-3 md:grid-cols-6 items-end">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <FiUser className="w-3 h-3" /> Customer
                </label>
                <select
                  value={currentItem.customerId || ''}
                  onChange={(e) => setCurrentItem({ ...currentItem, customerId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select</option>
                  {customers
                    .filter((c) => c.isActive !== false)
                    .map((c) => (
                      <option key={c._id || c.localId} value={c._id || c.localId}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Vegetable
                </label>
                <select
                  value={currentItem.vegetableCode || ''}
                  onChange={(e) => {
                    const veg = vegetables.find((v) => v.code === e.target.value);
                    setCurrentItem({
                      ...currentItem,
                      vegetableCode: e.target.value,
                      vegetableName: veg?.name,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select</option>
                  {vegetables
                    .filter((v) => v.isActive !== false)
                    .map((v) => (
                      <option key={v.code} value={v.code}>
                        {v.code} - {v.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Weight (KG)
                </label>
                <input
                  type="number"
                  value={currentItem.weightKg || ''}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, weightKg: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Price/20KG (₹)
                </label>
                <input
                  type="number"
                  value={currentItem.pricePer20Kg || ''}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      pricePer20Kg: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g., 500"
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Bags
                </label>
                <input
                  type="number"
                  value={currentItem.bags || ''}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, bags: parseInt(e.target.value) || 0 })
                  }
                  placeholder="1"
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <Button
                  onClick={addItem}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                  leftIcon={<FiPlus />}
                >
                  Add Item
                </Button>
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid gap-3 md:grid-cols-6 mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
              <div className="md:col-span-2 md:col-start-5 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Salesman</label>
                  <input
                    value={currentItem.salesman || ''}
                    onChange={(e) => setCurrentItem({ ...currentItem, salesman: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Def</label>
                  <input
                    value={currentItem.def || ''}
                    onChange={(e) => setCurrentItem({ ...currentItem, def: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 ? (
            <div className="mt-4">
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        Customer
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        Vegetable
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Weight
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Price/20KG
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Bags
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                        Amount
                      </th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                      <tr
                        key={item.id}
                        className="group hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {item.customerCode}
                          </span>
                          <span className="text-gray-500 ml-1">- {item.customerName}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {item.vegetableCode}
                          </span>
                          <span className="text-gray-500 ml-1">- {item.vegetableName}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{item.weightKg} KG</td>
                        <td className="px-3 py-2 text-right">₹{item.pricePer20Kg}</td>
                        <td className="px-3 py-2 text-right">{item.bags}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          ₹{item.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiTrash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary row */}
              <div className="flex justify-end mt-3">
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg px-4 py-2 flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {totalBags}
                    </div>
                    <div className="text-xs text-gray-500">Total Bags</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {totalWeight.toFixed(2)} KG
                    </div>
                    <div className="text-xs text-gray-500">Total Weight</div>
                  </div>
                  <div className="text-center border-l border-primary-200 dark:border-primary-700 pl-6">
                    <div className="text-xl font-bold text-primary-600">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">Total Amount</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <FiShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="font-medium">No items added yet</p>
              <p className="text-sm">Use the form above to add vegetables to this bill</p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Step 3: Charges & Final Calculation ──────────────────────── */}
      {items.length > 0 && (
        <Card>
          <CardHeader
            title="Step 3: Additional Charges & Final Amount"
            subtitle="Review calculations and apply additions"
          />
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left: Charges */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Additional Charges
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Commission (%)"
                    type="number"
                    value={charges.commissionPct}
                    onChange={(e) =>
                      setCharges({ ...charges, commissionPct: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <Input
                    label="Transportation"
                    type="number"
                    value={charges.transportation || ''}
                    onChange={(e) =>
                      setCharges({ ...charges, transportation: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <Input
                    label="Local Transport"
                    type="number"
                    value={charges.localTransportation || ''}
                    onChange={(e) =>
                      setCharges({
                        ...charges,
                        localTransportation: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    label="Other"
                    type="number"
                    value={charges.otherCharges || ''}
                    onChange={(e) =>
                      setCharges({ ...charges, otherCharges: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Middle: Bag Summary */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bag Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Bags (Farmer):</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {formData.bags || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Used Bags (Buyer):</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{totalBags}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-500">Unused Bags:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {Math.max(0, (formData.bags || 0) - totalBags)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Final Calculation */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Final Calculation
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Item Amount:</span>
                    <span className="font-medium">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Commission ({charges.commissionPct}%):</span>
                    <span>₹{commissionAmt.toFixed(2)}</span>
                  </div>
                  {charges.transportation > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Transportation:</span>
                      <span>₹{charges.transportation.toFixed(2)}</span>
                    </div>
                  )}
                  {charges.localTransportation > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Local Transport:</span>
                      <span>₹{charges.localTransportation.toFixed(2)}</span>
                    </div>
                  )}
                  {charges.otherCharges > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Other:</span>
                      <span>₹{charges.otherCharges.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-500">Total Additions:</span>
                    <span className="font-medium text-green-600">₹{totalCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 text-lg">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Total Bill Amount:
                    </span>
                    <span className="font-bold text-primary-600">
                      ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 sticky bottom-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-4 -mx-4 md:mx-0 md:p-0 md:bg-transparent md:backdrop-blur-none rounded-lg">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          leftIcon={<FiSave />}
          onClick={handleSave}
          isLoading={isLoading}
          disabled={items.length === 0}
        >
          Save Bill ({items.length} items)
        </Button>
      </div>

      {/* ── WhatsApp Share Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showWhatsApp}
        onClose={handleWhatsAppClose}
        title="Share Bills via WhatsApp"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bill #{savedBillNo} created successfully! Send individual bills to customers via WhatsApp.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Array.from(new Set(items.map((i) => i.customerId))).map((custId) => {
              const customer = customers.find((c) => (c._id || c.localId) === custId);
              const custItems = items.filter((i) => i.customerId === custId);
              const tw = custItems.reduce((s, i) => s + i.weightKg, 0);
              const ta = custItems.reduce((s, i) => s + i.amount, 0);

              return (
                <div
                  key={custId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {customer?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {custItems.length} items &bull; {tw} KG &bull; ₹{ta.toFixed(0)}
                    </p>
                    {customer?.phone ? (
                      <p className="text-xs text-green-600">{customer.phone}</p>
                    ) : (
                      <p className="text-xs text-red-500">No phone number</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => sendWhatsApp(custId)}
                    disabled={!customer?.phone}
                    leftIcon={<FiMessageCircle className="w-4 h-4" />}
                  >
                    Send
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={handleWhatsAppClose} leftIcon={<FiX />}>
              Skip
            </Button>
            <Button
              onClick={sendToAll}
              className="bg-green-600 hover:bg-green-700 text-white"
              leftIcon={<FiMessageCircle />}
            >
              Send to All
            </Button>
            <Button variant="primary" onClick={handleWhatsAppClose} leftIcon={<FiCheck />}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
