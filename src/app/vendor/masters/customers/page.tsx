'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select, Modal } from '@/components/ui';
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/onlineService';

interface CustomerItem {
  id: string;
  localId?: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  commissionRate: number;
  hamaliCharge: number;
  marketFeeRate: number;
  currentBalance: number;
  balanceType: string;
  isActive: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<CustomerItem | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    commissionRate: '5',
    hamaliCharge: '10',
    marketFeeRate: '1',
    openingBalance: '0',
    balanceType: 'Dr',
  });

  // ── Load customers (API-first, fallback to IndexedDB) ─────────
  const loadCustomers = useCallback(async () => {
    try {
      const storeData = await fetchCustomers();
      const mapped: CustomerItem[] = (storeData || []).map((c: any) => ({
        id: c._id || c.localId || c.id,
        localId: c.localId,
        _id: c._id,
        code: c.code,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        commissionRate: c.commissionRate || 5,
        hamaliCharge: c.hamaliCharge || 10,
        marketFeeRate: c.marketFeeRate || 1,
        currentBalance: c.currentBalance || c.openingBalance || 0,
        balanceType: c.balanceType || 'Dr',
        isActive: c.isActive !== false,
      }));
      setCustomers(mapped);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const columns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'city', header: 'City' },
    {
      key: 'commissionRate',
      header: 'Comm %',
      render: (value: number) => `${value}%`,
    },
    {
      key: 'currentBalance',
      header: 'Balance',
      sortable: true,
      render: (value: number, row: any) => (
        <span className={row.balanceType === 'Dr' ? 'text-red-600' : 'text-green-600'}>
          ₹{value.toLocaleString()} {row.balanceType}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'}>{value ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: CustomerItem) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <FiEdit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
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

  const handleEdit = (item: CustomerItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      phone: item.phone,
      email: '',
      address: item.address,
      city: item.city,
      state: '',
      pincode: '',
      gstNumber: '',
      commissionRate: item.commissionRate.toString(),
      hamaliCharge: item.hamaliCharge.toString(),
      marketFeeRate: item.marketFeeRate.toString(),
      openingBalance: item.currentBalance.toString(),
      balanceType: item.balanceType,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        const item = customers.find((c) => c.id === id);
        const deleteId = (item as any)?._id || item?.localId || id;
        await deleteCustomer(deleteId);
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        toast.success('Customer deleted');
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error('Failed to delete customer');
      }
    }
  };

  const generateCode = () => {
    const lastCode = customers
      .map((c) => parseInt(c.code.replace('C', '')))
      .sort((a, b) => b - a)[0];
    return `C${String((lastCode || 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gstNumber: formData.gstNumber,
        commissionRate: parseFloat(formData.commissionRate),
        hamaliCharge: parseFloat(formData.hamaliCharge),
        marketFeeRate: parseFloat(formData.marketFeeRate),
        openingBalance: parseFloat(formData.openingBalance),
        currentBalance: parseFloat(formData.openingBalance),
        balanceType: formData.balanceType as 'Cr' | 'Dr',
      };

      if (editingItem) {
        const editId = (editingItem as any)?._id || editingItem?.localId || editingItem.id;
        await updateCustomer(editId, updateData);
        toast.success('Customer updated');
      } else {
        const code = formData.code || generateCode();
        await createCustomer({ ...updateData, code, isActive: true });
        toast.success('Customer added');
      }

      await loadCustomers();

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save customer');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstNumber: '',
      commissionRate: '5',
      hamaliCharge: '10',
      marketFeeRate: '1',
      openingBalance: '0',
      balanceType: 'Dr',
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, code: generateCode() }));
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Master</h1>
        <Button leftIcon={<FiPlus />} onClick={openAddModal}>
          Add Customer
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Receivable</p>
          <p className="text-xl font-bold text-red-600">
            ₹
            {customers
              .filter((c) => c.balanceType === 'Dr')
              .reduce((sum, c) => sum + c.currentBalance, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Payable</p>
          <p className="text-xl font-bold text-green-600">
            ₹
            {customers
              .filter((c) => c.balanceType === 'Cr')
              .reduce((sum, c) => sum + c.currentBalance, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader title="All Customers" />
        <DataTable
          columns={columns}
          data={customers}
          keyField="id"
          searchPlaceholder="Search by name, code or phone..."
          pageSize={10}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Customer' : 'Add Customer'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isLoading}>
              {editingItem ? 'Update' : 'Add Customer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              disabled
            />
            <Input
              label="Customer Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="City" name="city" value={formData.city} onChange={handleChange} />
            <Input label="State" name="state" value={formData.state} onChange={handleChange} />
            <Input label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
          </div>

          <Input
            label="GST Number"
            name="gstNumber"
            value={formData.gstNumber}
            onChange={handleChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Commission Rate (%)"
              name="commissionRate"
              type="number"
              value={formData.commissionRate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
            />
            <Input
              label="Hamali Charge (₹)"
              name="hamaliCharge"
              type="number"
              value={formData.hamaliCharge}
              onChange={handleChange}
              min="0"
            />
            <Input
              label="Market Fee (%)"
              name="marketFeeRate"
              type="number"
              value={formData.marketFeeRate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Opening Balance"
              name="openingBalance"
              type="number"
              value={formData.openingBalance}
              onChange={handleChange}
              min="0"
            />
            <Select
              label="Balance Type"
              name="balanceType"
              value={formData.balanceType}
              onChange={handleChange}
              options={[
                { value: 'Dr', label: 'Debit (Receivable)' },
                { value: 'Cr', label: 'Credit (Payable)' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
