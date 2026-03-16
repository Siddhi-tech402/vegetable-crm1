'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select, Modal } from '@/components/ui';
import { fetchVegetables, createVegetable, updateVegetable, deleteVegetable } from '@/lib/onlineService';

// ── Hindi name lookup for common vegetables ─────────────────────────────
const hindiNameMap: Record<string, string> = {
  tomato: 'टमाटर',
  potato: 'आलू',
  onion: 'प्याज',
  cabbage: 'पत्तागोभी',
  spinach: 'पालक',
  cauliflower: 'फूलगोभी',
  brinjal: 'बैंगन',
  eggplant: 'बैंगन',
  capsicum: 'शिमला मिर्च',
  carrot: 'गाजर',
  'green peas': 'मटर',
  peas: 'मटर',
  radish: 'मूली',
  cucumber: 'खीरा',
  'bottle gourd': 'लौकी',
  lauki: 'लौकी',
  'bitter gourd': 'करेला',
  karela: 'करेला',
  'ridge gourd': 'तुरई',
  turai: 'तुरई',
  pumpkin: 'कद्दू',
  'lady finger': 'भिंडी',
  ladyfinger: 'भिंडी',
  okra: 'भिंडी',
  bhindi: 'भिंडी',
  beans: 'सेम',
  'french beans': 'फ्रेंच बीन्स',
  'green chilli': 'हरी मिर्च',
  chilli: 'मिर्च',
  ginger: 'अदरक',
  garlic: 'लहसुन',
  coriander: 'धनिया',
  mint: 'पुदीना',
  fenugreek: 'मेथी',
  methi: 'मेथी',
  'drumstick': 'सहजन',
  mushroom: 'मशरूम',
  'sweet potato': 'शकरकंद',
  beetroot: 'चुकंदर',
  turnip: 'शलगम',
  corn: 'मक्का',
  lemon: 'नींबू',
  coconut: 'नारियल',
  banana: 'केला',
  papaya: 'पपीता',
  mango: 'आम',
  apple: 'सेब',
  grapes: 'अंगूर',
  watermelon: 'तरबूज',
  jackfruit: 'कटहल',
  broccoli: 'ब्रोकली',
  lettuce: 'सलाद पत्ता',
  celery: 'अजवाइन',
  asparagus: 'शतावरी',
  zucchini: 'तोरी',
  'spring onion': 'हरा प्याज',
  'cluster beans': 'ग्वार फली',
  'ivy gourd': 'कुंदरू',
  parwal: 'परवल',
  tinda: 'टिंडा',
  arbi: 'अरबी',
  'colocasia': 'अरबी',
  'raw banana': 'कच्चा केला',
  'snake gourd': 'चिचिंडा',
  'pointed gourd': 'परवल',
  'ash gourd': 'पेठा',
};

// Get Hindi name suggestion from English name
function getHindiSuggestion(englishName: string): string {
  if (!englishName) return '';
  const key = englishName.toLowerCase().trim();
  return hindiNameMap[key] || '';
}

// ── Default vegetable data with Hindi names ─────────────────────────────
interface VegetableItem {
  id: string;
  localId?: string;
  code: string;
  name: string;
  localName: string;
  category: string;
  unit: string;
  defaultPrice: number;
  isActive: boolean;
}

const categoryOptions = [
  { value: 'Leafy', label: 'Leafy Vegetables' },
  { value: 'Root', label: 'Root Vegetables' },
  { value: 'Fruit', label: 'Fruit Vegetables' },
  { value: 'Flower', label: 'Flower Vegetables' },
  { value: 'Stem', label: 'Stem Vegetables' },
  { value: 'Bulb', label: 'Bulb Vegetables' },
  { value: 'Other', label: 'Other' },
];

const unitOptions = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'piece', label: 'Piece' },
  { value: 'bundle', label: 'Bundle' },
];

export default function VegetablesPage() {
  const [vegetables, setVegetables] = useState<VegetableItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<VegetableItem | null>(null);
  const [hindiSuggestion, setHindiSuggestion] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    localName: '',
    category: 'Other',
    unit: 'kg',
    defaultPrice: '',
  });

  // ── Load vegetables (API-first, fallback to IndexedDB) ─────────
  useEffect(() => {
    const loadVegetables = async () => {
      try {
        const storeData = await fetchVegetables();
        if (storeData && storeData.length > 0) {
          const mapped: VegetableItem[] = storeData.map((v: any) => ({
            id: v._id || v.localId || v.id,
            localId: v.localId,
            _id: v._id,
            code: v.code,
            name: v.name,
            localName: v.localName || getHindiSuggestion(v.name) || '',
            category: v.category,
            unit: v.unit,
            defaultPrice: v.defaultPrice || 0,
            isActive: v.isActive !== false,
          }));
          setVegetables(mapped);
        } else {
          setVegetables([]);
        }
      } catch (error) {
        console.error('Failed to load vegetables:', error);
        setVegetables([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadVegetables();
  }, []);

  const columns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'localName',
      header: 'Local Name (हिंदी)',
      render: (value: string) => (
        <span className="font-hindi text-base">{value || '-'}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    { key: 'unit', header: 'Unit' },
    {
      key: 'defaultPrice',
      header: 'Default Price',
      render: (value: number, row: any) => `₹${value}/${row.unit}`,
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
      render: (_: any, row: VegetableItem) => (
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

    // Auto-suggest Hindi name when entering English name
    if (name === 'name') {
      const suggestion = getHindiSuggestion(value);
      setHindiSuggestion(suggestion);
      // Auto-fill localName if user hasn't manually typed one
      if (suggestion && !formData.localName) {
        setFormData((prev) => ({ ...prev, [name]: value, localName: suggestion }));
      }
    }
  };

  const handleEdit = (item: VegetableItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      localName: item.localName,
      category: item.category,
      unit: item.unit,
      defaultPrice: item.defaultPrice.toString(),
    });
    setHindiSuggestion(getHindiSuggestion(item.name));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vegetable?')) {
      try {
        const item = vegetables.find((v) => v.id === id);
        const deleteId = (item as any)?._id || item?.localId || id;
        await deleteVegetable(deleteId);
        setVegetables((prev) => prev.filter((item) => item.id !== id));
        toast.success('Vegetable deleted');
      } catch (error) {
        console.error('Delete failed:', error);
        setVegetables((prev) => prev.filter((item) => item.id !== id));
        toast.success('Vegetable deleted');
      }
    }
  };

  const generateCode = () => {
    const lastCode = vegetables
      .map((v) => parseInt(v.code.replace('V', '')))
      .sort((a, b) => b - a)[0];
    return `V${String((lastCode || 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Auto-fill localName with Hindi if user left it empty or entered English
    let finalLocalName = formData.localName;
    if (!finalLocalName || /^[a-zA-Z\s]+$/.test(finalLocalName)) {
      const suggestion = getHindiSuggestion(finalLocalName || formData.name);
      if (suggestion) finalLocalName = suggestion;
    }

    try {
      const updateData = {
        name: formData.name,
        localName: finalLocalName,
        category: formData.category,
        unit: formData.unit,
        defaultPrice: parseFloat(formData.defaultPrice) || 0,
      };

      if (editingItem) {
        const editId = (editingItem as any)?._id || editingItem?.localId || editingItem.id;
        await updateVegetable(editId, updateData);
        toast.success('Vegetable updated');
      } else {
        const code = formData.code || generateCode();
        await createVegetable({ ...updateData, code, isActive: true });
        toast.success('Vegetable added');
      }

      // Reload data from server/IndexedDB
      const reloaded = await fetchVegetables();
      if (reloaded && reloaded.length > 0) {
        setVegetables(reloaded.map((v: any) => ({
          id: v._id || v.localId || v.id,
          localId: v.localId,
          _id: v._id,
          code: v.code,
          name: v.name,
          localName: v.localName || getHindiSuggestion(v.name) || '',
          category: v.category,
          unit: v.unit,
          defaultPrice: v.defaultPrice || 0,
          isActive: v.isActive !== false,
        })));
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save vegetable');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      localName: '',
      category: 'Other',
      unit: 'kg',
      defaultPrice: '',
    });
    setEditingItem(null);
    setHindiSuggestion('');
  };

  const openAddModal = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, code: generateCode() }));
    setIsModalOpen(true);
  };

  // Group by category
  const categoryCounts = vegetables.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vegetable Master</h1>
        <Button leftIcon={<FiPlus />} onClick={openAddModal}>
          Add Vegetable
        </Button>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {categoryOptions.map((cat) => (
          <div
            key={cat.value}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{cat.label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {categoryCounts[cat.value] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Vegetables Table */}
      <Card>
        <CardHeader title="All Vegetables" subtitle={`Total: ${vegetables.length} items`} />
        <DataTable
          columns={columns}
          data={vegetables}
          keyField="id"
          searchPlaceholder="Search by name or code..."
          pageSize={10}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Vegetable' : 'Add Vegetable'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isLoading}>
              {editingItem ? 'Update' : 'Add Vegetable'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Vegetable Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              disabled
            />
            <Input
              label="Vegetable Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Input
              label="Local Name (हिंदी नाम)"
              name="localName"
              value={formData.localName}
              onChange={handleChange}
              placeholder="हिंदी में नाम लिखें (e.g. टमाटर, आलू)"
              className="font-hindi"
            />
            {hindiSuggestion && formData.localName !== hindiSuggestion && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, localName: hindiSuggestion }))}
                className="mt-1 text-sm text-primary-600 dark:text-primary-400 hover:underline font-hindi"
              >
                💡 Suggested: <span className="font-semibold">{hindiSuggestion}</span> — click to use
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={categoryOptions}
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
            label="Default Price"
            name="defaultPrice"
            type="number"
            value={formData.defaultPrice}
            onChange={handleChange}
            min="0"
            step="0.01"
            helperText={`Price per ${formData.unit}`}
          />
        </form>
      </Modal>
    </div>
  );
}
