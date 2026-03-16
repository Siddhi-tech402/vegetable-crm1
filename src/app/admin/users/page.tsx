'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiEdit2, FiTrash2, FiUserCheck, FiUserX, FiMail } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, CardHeader, DataTable, Badge, Button, Input, Select, Modal } from '@/components/ui';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
}

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'farmer', label: 'Farmer' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'farmer',
    status: 'pending',
  });

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const mapped: UserItem[] = (data.users || []).map((u: any) => ({
          id: u._id || u.id,
          name: u.name || '',
          email: u.email || '',
          role: u.role || 'farmer',
          status: u.isActive === false ? 'inactive' : 'active',
          lastLogin: u.lastLogin || null,
          createdAt: u.createdAt || '',
        }));
        setUsers(mapped);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (value: string) => {
        const variants: Record<string, 'info' | 'success' | 'warning'> = {
          admin: 'warning',
          vendor: 'info',
          farmer: 'success',
        };
        return <Badge variant={variants[value]}>{value.charAt(0).toUpperCase() + value.slice(1)}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => {
        const variants: Record<string, 'success' | 'danger' | 'warning'> = {
          active: 'success',
          inactive: 'danger',
          pending: 'warning',
        };
        return <Badge variant={variants[value]}>{value.charAt(0).toUpperCase() + value.slice(1)}</Badge>;
      },
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (value: string | null) =>
        value ? format(new Date(value), 'dd/MM/yyyy HH:mm') : 'Never',
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: UserItem) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Edit">
            <FiEdit2 className="w-4 h-4" />
          </Button>
          {row.status === 'pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleApprove(row.id)}
              title="Approve"
            >
              <FiUserCheck className="w-4 h-4 text-green-500" />
            </Button>
          )}
          {row.status === 'active' && row.role !== 'admin' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeactivate(row.id)}
              title="Deactivate"
            >
              <FiUserX className="w-4 h-4 text-orange-500" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSendEmail(row.email)}
            title="Send Email"
          >
            <FiMail className="w-4 h-4 text-blue-500" />
          </Button>
          {row.role !== 'admin' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(row.id)}
              title="Delete"
            >
              <FiTrash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleApprove = (id: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, status: 'active' } : user))
    );
    toast.success('User approved');
  };

  const handleDeactivate = (id: string) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, status: 'inactive' } : user))
      );
      toast.success('User deactivated');
    }
  };

  const handleSendEmail = (email: string) => {
    toast.success(`Email sent to ${email}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers((prev) => prev.filter((user) => user.id !== id));
      toast.success('User deleted');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser.id ? { ...user, ...formData } : user
        )
      );
      toast.success('User updated');
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchRole = !roleFilter || user.role === roleFilter;
    const matchStatus = !statusFilter || user.status === statusFilter;
    return matchRole && matchStatus;
  });

  // Stats
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    pending: users.filter((u) => u.status === 'pending').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-600">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-500">Inactive</p>
          <p className="text-2xl font-bold text-red-500">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters & Table */}
      <Card>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Filter by Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleOptions}
            />
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setRoleFilter('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        <CardHeader
          title="All Users"
          subtitle={`Showing ${filteredUsers.length} of ${users.length} users`}
        />
        <DataTable
          columns={columns}
          data={filteredUsers}
          keyField="id"
          searchPlaceholder="Search by name or email..."
          pageSize={10}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Update User</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={roleOptions.filter((r) => r.value)}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={statusOptions.filter((s) => s.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
