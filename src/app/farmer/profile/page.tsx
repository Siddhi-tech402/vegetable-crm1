'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FiSave, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Card, CardHeader, Button, Input, Select } from '@/components/ui';

export default function FarmerProfilePage() {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    phone: '9876543210',
    email: session?.user?.email || '',
    address: '123 Farm Lane, Village',
    village: 'Green Village',
    district: 'Farm District',
    state: 'Maharashtra',
    pincode: '411001',
    bankName: 'State Bank of India',
    accountNumber: '1234567890',
    ifscCode: 'SBIN0001234',
    accountHolderName: session?.user?.name || '',
    cropTypes: ['Tomato', 'Potato', 'Onion'],
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} leftIcon={<FiEdit2 />}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isLoading} leftIcon={<FiSave />}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader title="Personal Information" subtitle="Your basic contact details" />
          <div className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Village"
                name="village"
                value={formData.village}
                onChange={handleChange}
                disabled={!isEditing}
              />
              <Input
                label="District"
                name="district"
                value={formData.district}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                disabled={!isEditing}
              />
              <Input
                label="Pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
          </div>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader title="Bank Details" subtitle="For receiving payments" />
          <div className="space-y-4">
            <Input
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <Input
              label="Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <Input
              label="IFSC Code"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              disabled={!isEditing}
            />
            <Input
              label="Account Holder Name"
              name="accountHolderName"
              value={formData.accountHolderName}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>
        </Card>

        {/* Crop Types */}
        <Card className="lg:col-span-2">
          <CardHeader title="Crop Types" subtitle="Vegetables you typically supply" />
          <div className="flex flex-wrap gap-2">
            {formData.cropTypes.map((crop) => (
              <span
                key={crop}
                className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
              >
                {crop}
                {isEditing && (
                  <button
                    className="ml-2 text-primary-600 hover:text-primary-800"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        cropTypes: prev.cropTypes.filter((c) => c !== crop),
                      }))
                    }
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {isEditing && (
              <select
                className="px-3 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-full text-sm bg-transparent"
                onChange={(e) => {
                  if (e.target.value && !formData.cropTypes.includes(e.target.value)) {
                    setFormData((prev) => ({
                      ...prev,
                      cropTypes: [...prev.cropTypes, e.target.value],
                    }));
                  }
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
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
