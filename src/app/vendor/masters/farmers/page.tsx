'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select, Modal } from '@/components/ui';
import { fetchFarmers, createFarmer, updateFarmer, deleteFarmer } from '@/lib/onlineService';

interface FarmerItem {
  id: string;
  localId?: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  village: string;
  district: string;
  cropTypes: string[];
  currentBalance: number;
  balanceType: string;
  isActive: boolean;
}

const cropOptions = [
  { value: 'Tomato', label: 'Tomato' },
  { value: 'Potato', label: 'Potato' },
  { value: 'Onion', label: 'Onion' },
  { value: 'Cabbage', label: 'Cabbage' },
  { value: 'Cauliflower', label: 'Cauliflower' },
  { value: 'Carrot', label: 'Carrot' },
  { value: 'Spinach', label: 'Spinach' },
  { value: 'Brinjal', label: 'Brinjal' },
];

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<FarmerItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<FarmerItem | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    village: '',
    district: '',
    state: '',
    pincode: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    cropTypes: [] as string[],
    openingBalance: '0',
    balanceType: 'Cr',
  });

  // ── Load farmers (API-first, fallback to IndexedDB) ─────────────────
  const loadFarmers = useCallback(async () => {
    try {
      const storeData = await fetchFarmers();
      const mapped: FarmerItem[] = (storeData || []).map((f: any) => ({
        id: f._id || f.localId || f.id,
        localId: f.localId,
        _id: f._id,
        code: f.code,
        name: f.name,
        phone: f.phone || '',
        address: f.address || '',
        village: f.village || '',
        district: f.district || '',
        cropTypes: f.cropTypes || [],
        currentBalance: f.currentBalance || f.openingBalance || 0,
        balanceType: f.balanceType || 'Cr',
        isActive: f.isActive !== false,
      }));
      setFarmers(mapped);
    } catch (error) {
      console.error('Failed to load farmers:', error);
      setFarmers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  const columns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'village', header: 'Village' },
    {
      key: 'cropTypes',
      header: 'Crops',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 2).map((crop) => (
            <Badge key={crop} variant="info" size="sm">
              {crop}
            </Badge>
          ))}
          {value.length > 2 && (
            <Badge variant="default" size="sm">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'currentBalance',
      header: 'Payable',
      sortable: true,
      render: (value: number, row: any) => (
        <span className={row.balanceType === 'Cr' ? 'text-red-600' : 'text-green-600'}>
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
      render: (_: any, row: FarmerItem) => (
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

  const handleEdit = (item: FarmerItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      phone: item.phone,
      email: '',
      address: item.address,
      village: item.village,
      district: item.district,
      state: '',
      pincode: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      cropTypes: item.cropTypes,
      openingBalance: item.currentBalance.toString(),
      balanceType: item.balanceType,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this farmer?')) {
      try {
        const item = farmers.find((f) => f.id === id);
        const deleteId = (item as any)?._id || item?.localId || id;
        await deleteFarmer(deleteId);
        setFarmers((prev) => prev.filter((f) => f.id !== id));
        toast.success('Farmer deleted');
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error('Failed to delete farmer');
      }
    }
  };

  const generateCode = () => {
    const lastCode = farmers
      .map((f) => parseInt(f.code.replace('F', '')))
      .sort((a, b) => b - a)[0];
    return `F${String((lastCode || 0) + 1).padStart(4, '0')}`;
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
        village: formData.village,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        accountHolderName: formData.accountHolderName,
        cropTypes: formData.cropTypes,
        openingBalance: parseFloat(formData.openingBalance),
        currentBalance: parseFloat(formData.openingBalance),
        balanceType: formData.balanceType as 'Cr' | 'Dr',
      };

      if (editingItem) {
        const editId = (editingItem as any)?._id || editingItem?.localId || editingItem.id;
        await updateFarmer(editId, updateData);
        toast.success('Farmer updated');
      } else {
        const code = formData.code || generateCode();
        await createFarmer({ ...updateData, code, isActive: true });
        toast.success('Farmer added');
      }

      await loadFarmers();

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save farmer');
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
      village: '',
      district: '',
      state: '',
      pincode: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      cropTypes: [],
      openingBalance: '0',
      balanceType: 'Cr',
    });
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, code: generateCode() }));
    setIsModalOpen(true);
  };

  const addCropType = (crop: string) => {
    if (crop && !formData.cropTypes.includes(crop)) {
      setFormData((prev) => ({ ...prev, cropTypes: [...prev.cropTypes, crop] }));
    }
  };

  const removeCropType = (crop: string) => {
    setFormData((prev) => ({
      ...prev,
      cropTypes: prev.cropTypes.filter((c) => c !== crop),
    }));
  };

  const totalPayable = farmers
    .filter((f) => f.balanceType === 'Cr')
    .reduce((sum, f) => sum + f.currentBalance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Farmer Master</h1>
        <Button leftIcon={<FiPlus />} onClick={openAddModal}>
          Add Farmer
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Farmers</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{farmers.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Payable</p>
          <p className="text-xl font-bold text-red-600">₹{totalPayable.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Farmers</p>
          <p className="text-xl font-bold text-green-600">
            {farmers.filter((f) => f.isActive).length}
          </p>
        </div>
      </div>

      {/* Farmers Table */}
      <Card>
        <CardHeader title="All Farmers" />
        <DataTable
          columns={columns}
          data={farmers}
          keyField="id"
          searchPlaceholder="Search by name, code or phone..."
          pageSize={10}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Farmer' : 'Add Farmer'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isLoading}>
              {editingItem ? 'Update' : 'Add Farmer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Farmer Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              disabled
            />
            <Input
              label="Farmer Name"
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input label="Village" name="village" value={formData.village} onChange={handleChange} />
            <Input
              label="District"
              name="district"
              value={formData.district}
              onChange={handleChange}
            />
            <Input label="State" name="state" value={formData.state} onChange={handleChange} />
            <Input label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
          </div>

          {/* Crop Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crop Types
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.cropTypes.map((crop) => (
                <span
                  key={crop}
                  className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  {crop}
                  <button
                    type="button"
                    className="ml-2 text-primary-600 hover:text-primary-800"
                    onClick={() => removeCropType(crop)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <select
                className="px-3 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-full text-sm bg-transparent"
                onChange={(e) => {
                  addCropType(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">+ Add Crop</option>
                {cropOptions
                  .filter((opt) => !formData.cropTypes.includes(opt.value))
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium mb-4">Bank Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
              />
              <Input
                label="Account Number"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
              />
              <Input
                label="IFSC Code"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
              />
              <Input
                label="Account Holder Name"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Opening Balance */}
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
                { value: 'Cr', label: 'Credit (Payable)' },
                { value: 'Dr', label: 'Debit (Receivable)' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
