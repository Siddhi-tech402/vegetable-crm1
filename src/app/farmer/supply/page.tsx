'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select, Modal } from '@/components/ui';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { fetchSupplyEntries, fetchVegetables, createSupplyEntry, fetchSalesBills } from '@/lib/onlineService';

interface SupplyItem {
  id: string;
  entryDate: string;
  vegetableName: string;
  quantity: number;
  unit: string;
  expectedPrice: number;
  expectedAmount: number;
  status: string;
  soldQuantity: number;
}

const unitOptions = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'piece', label: 'Piece' },
  { value: 'bundle', label: 'Bundle' },
];

export default function FarmerSupplyPage() {
  const { financialYear } = useFinancialYear();
  const [supplyData, setSupplyData] = useState<SupplyItem[]>([]);
  const [vegetableOptions, setVegetableOptions] = useState<{ value: string; label: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);

  const [formData, setFormData] = useState({
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    vegetableName: '',
    quantity: '',
    unit: 'kg',
    expectedPrice: '',
  });

  // Load supply entries and vegetables
  const loadData = useCallback(async () => {
    try {
      const [supplyEntries, vegetables, salesBills] = await Promise.all([
        fetchSupplyEntries(),
        fetchVegetables(),
        fetchSalesBills(),
      ]);

      // Calculate total sold by vegetable (across all time)
      const totalSoldByVeg: Record<string, number> = {};
      const bills = salesBills as any[];
      bills.forEach((bill) => {
        bill.buyers?.forEach((buyer: any) => {
          buyer.items?.forEach((item: any) => {
            const vName = String(item.vegetableName).toLowerCase().trim();
            totalSoldByVeg[vName] = (totalSoldByVeg[vName] || 0) + (item.quantity ?? item.qty ?? 0);
          });
        });
      });

      // Sort raw entries chronologically for FIFO allocation
      const rawEntries = [...(supplyEntries as any[])].sort((a, b) => {
        const da = new Date(a.entryDate || a.date).getTime();
        const db = new Date(b.entryDate || b.date).getTime();
        return da - db;
      });

      const allocatedSoldItemsMap = new Map<string, number>();

      // Perform FIFO allocation
      rawEntries.forEach((entry) => {
        const vegName = String(entry.items?.[0]?.vegetableName || entry.vegetableName || '').toLowerCase().trim();
        const totalQty = entry.quantity || entry.totalQty || (entry.items || []).reduce((s: number, i: any) => s + (i.qty || 0), 0);
        const id = entry.localId || entry._id || entry.id || '';
        
        const remainingSold = totalSoldByVeg[vegName] || 0;
        const allocation = Math.min(totalQty, remainingSold);
        
        allocatedSoldItemsMap.set(id, allocation);
        if (remainingSold > 0) {
          totalSoldByVeg[vegName] -= allocation;
        }
      });

      // Map supply entries with accurately calculated "soldQuantity"
      const items: SupplyItem[] = (supplyEntries as any[]).map((entry: any) => {
        const totalQty = entry.quantity || entry.totalQty || (entry.items || []).reduce((s: number, i: any) => s + (i.qty || 0), 0);
        const totalAmount = entry.expectedAmount || entry.totalAmount || (entry.items || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
        const vegName = entry.items?.[0]?.vegetableName || entry.vegetableName || '';
        const id = entry.localId || entry._id || entry.id || '';

        const calculatedSold = allocatedSoldItemsMap.get(id) || entry.soldQuantity || 0;
        let finalStatus = entry.status || 'pending';
        if (calculatedSold >= totalQty && totalQty > 0) finalStatus = 'sold';
        else if (calculatedSold > 0) finalStatus = 'partial';

        return {
          id,
          entryDate: entry.entryDate
            ? String(entry.entryDate).split('T')[0]
            : entry.date
            ? String(entry.date).split('T')[0]
            : '',
          vegetableName: vegName,
          quantity: totalQty,
          unit: entry.unit || entry.items?.[0]?.unit || 'kg',
          expectedPrice: totalQty > 0 ? totalAmount / totalQty : 0,
          expectedAmount: totalAmount,
          status: finalStatus,
          soldQuantity: calculatedSold,
        };
      })
      // Sort by latest for display
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
      
      setSupplyData(items);

      // Build vegetable options from store
      const vegOptions = (vegetables as any[])
        .filter((v: any) => v.isActive !== false)
        .map((v: any) => ({
          value: v.name,
          label: v.name,
        }));
      setVegetableOptions(vegOptions);
    } catch (error) {
      console.error('Failed to load supply data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    {
      key: 'entryDate',
      header: 'Date',
      sortable: true,
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    { key: 'vegetableName', header: 'Vegetable', sortable: true },
    {
      key: 'quantity',
      header: 'Qty',
      sortable: true,
      render: (value: number, row: any) => `${value} ${row.unit}`,
    },
    {
      key: 'expectedPrice',
      header: 'Exp. Rate',
      render: (value: number, row: any) => `₹${value}/${row.unit}`,
    },
    {
      key: 'expectedAmount',
      header: 'Exp. Amount',
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'soldQuantity',
      header: 'Sold',
      render: (value: number, row: any) => `${value} ${row.unit}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'sold' ? 'success' : value === 'pending' ? 'warning' : 'info'}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: SupplyItem) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row)}
            disabled={row.status !== 'pending'}
          >
            <FiEdit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row.id)}
            disabled={row.status !== 'pending'}
          >
            <FiTrash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (item: SupplyItem) => {
    setEditingItem(item);
    setFormData({
      entryDate: item.entryDate,
      vegetableName: item.vegetableName,
      quantity: item.quantity.toString(),
      unit: item.unit,
      expectedPrice: item.expectedPrice.toString(),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supply entry?')) {
      try {
        const res = await fetch(`/api/supply-entries/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setSupplyData((prev) => prev.filter((item) => item.id !== id));
        toast.success('Supply entry deleted');
      } catch (error) {
        toast.error('Failed to delete supply entry');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const quantity = parseFloat(formData.quantity);
      const expectedPrice = parseFloat(formData.expectedPrice);
      const expectedAmount = quantity * expectedPrice;

      if (editingItem) {
        // Update existing via API
        const res = await fetch(`/api/supply-entries/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formData.entryDate,
            items: [{
              vegetableName: formData.vegetableName,
              vegetableCode: '',
              unit: formData.unit,
              qty: quantity,
              rate: expectedPrice,
              amount: expectedAmount,
            }],
            totalQty: quantity,
            totalAmount: expectedAmount,
          }),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Supply entry updated');
      } else {
        // Create new via API
        await createSupplyEntry({
          date: formData.entryDate,
          farmerCode: '',
          farmerName: '',
          entryNumber: `SE-${Date.now()}`,
          items: [{
            vegetableName: formData.vegetableName,
            vegetableCode: '',
            unit: formData.unit,
            qty: quantity,
            rate: expectedPrice,
            amount: expectedAmount,
          }],
          totalQty: quantity,
          totalAmount: expectedAmount,
          financialYear: financialYear,
        } as any);
        toast.success('Supply entry added');
      }

      await loadData();

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save supply entry');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      vegetableName: '',
      quantity: '',
      unit: 'kg',
      expectedPrice: '',
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Calculate totals
  const totalQuantity = supplyData.reduce((sum, item) => sum + item.quantity, 0);
  const totalExpectedAmount = supplyData.reduce((sum, item) => sum + item.expectedAmount, 0);
  const totalSoldQuantity = supplyData.reduce((sum, item) => sum + item.soldQuantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vegetable Supply Entry</h1>
        <Button leftIcon={<FiPlus />} onClick={openAddModal}>
          Add Supply
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Supplied</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalQuantity} kg</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expected Amount</p>
          <p className="text-xl font-bold text-green-600">₹{totalExpectedAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Sold</p>
          <p className="text-xl font-bold text-blue-600">{totalSoldQuantity} kg</p>
        </div>
      </div>

      {/* Supply Table */}
      <Card>
        <CardHeader title="Supply Entries" subtitle={`Financial Year: ${financialYear}`} />
        <DataTable
          columns={columns}
          data={supplyData}
          keyField="id"
          searchPlaceholder="Search by vegetable name..."
          pageSize={10}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Supply Entry' : 'Add Supply Entry'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isLoading}>
              {editingItem ? 'Update' : 'Add Entry'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Entry Date"
            type="date"
            name="entryDate"
            value={formData.entryDate}
            onChange={handleChange}
            required
          />
          <Select
            label="Vegetable"
            name="vegetableName"
            value={formData.vegetableName}
            onChange={handleChange}
            options={vegetableOptions}
            placeholder="Select vegetable"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              step="0.1"
              required
            />
            <Select
              label="Unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              options={unitOptions}
              required
            />
          </div>
          <Input
            label="Expected Price (per unit)"
            type="number"
            name="expectedPrice"
            value={formData.expectedPrice}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
          {formData.quantity && formData.expectedPrice && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Expected Amount</p>
              <p className="text-xl font-bold text-green-600">
                ₹{(parseFloat(formData.quantity) * parseFloat(formData.expectedPrice)).toLocaleString()}
              </p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
