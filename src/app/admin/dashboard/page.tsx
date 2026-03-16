'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiUsers,
  FiUserCheck,
  FiTruck,
  FiActivity,
  FiSettings,
  FiDatabase,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi';
import { Card, CardHeader, StatCard, Button, Badge } from '@/components/ui';
import { getSyncQueueStats } from '@/offline';
import { fetchFarmers, fetchCustomers } from '@/lib/onlineService';

export default function AdminDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalVendors: 0,
    totalFarmers: 0,
    pendingApprovals: 0,
    syncErrors: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const allFarmers = await fetchFarmers() as any[];
      const allCustomers = await fetchCustomers() as any[];
      const syncStats = await getSyncQueueStats();

      setSystemStats({
        totalUsers: allFarmers.length + allCustomers.length,
        activeUsers: allFarmers.filter((f: any) => f.isActive).length +
          allCustomers.filter((c: any) => c.isActive).length,
        totalVendors: allCustomers.length,
        totalFarmers: allFarmers.length,
        pendingApprovals: 0,
        syncErrors: syncStats.failed,
      });

      // Show recent entries
      const allEntries = [
        ...allFarmers.map((f: any) => ({
          id: f.localId,
          name: f.name,
          email: f.email || f.phone || '',
          role: 'farmer',
          status: f.isActive ? 'active' : 'inactive',
          joinedAt: f.createdAt ? f.createdAt.split('T')[0] : '',
        })),
        ...allCustomers.map((c: any) => ({
          id: c.localId,
          name: c.name,
          email: c.email || c.phone || '',
          role: 'vendor',
          status: c.isActive ? 'active' : 'inactive',
          joinedAt: c.createdAt ? c.createdAt.split('T')[0] : '',
        })),
      ]
        .sort((a, b) => (b.joinedAt || '').localeCompare(a.joinedAt || ''))
        .slice(0, 4);
      setRecentUsers(allEntries);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefreshStats = async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">System overview and management</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} />}
          onClick={handleRefreshStats}
          disabled={isRefreshing}
        >
          Refresh Stats
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={systemStats.totalUsers}
          icon={<FiUsers className="w-6 h-6" />}
          change={12}
          changeLabel="vs last month"
        />
        <StatCard
          title="Active Users"
          value={systemStats.activeUsers}
          icon={<FiUserCheck className="w-6 h-6" />}
          colorClass="bg-green-500"
        />
        <StatCard
          title="Vendors"
          value={systemStats.totalVendors}
          icon={<FiActivity className="w-6 h-6" />}
          colorClass="bg-blue-500"
        />
        <StatCard
          title="Farmers"
          value={systemStats.totalFarmers}
          icon={<FiTruck className="w-6 h-6" />}
          colorClass="bg-yellow-500"
        />
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500 text-white rounded-lg">
                <FiDatabase className="w-5 h-5" />
              </div>
              <span className="font-medium">Database</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">IndexedDB</p>
            <p className="text-sm text-gray-500">Offline-first with sync</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500 text-white rounded-lg">
                <FiShield className="w-5 h-5" />
              </div>
              <span className="font-medium">Security</span>
            </div>
            <p className="text-2xl font-bold text-green-600">All Systems Normal</p>
            <p className="text-sm text-gray-500">No security alerts</p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500 text-white rounded-lg">
                <FiRefreshCw className="w-5 h-5" />
              </div>
              <span className="font-medium">Sync Status</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{systemStats.syncErrors} Errors</p>
            <p className="text-sm text-gray-500">Pending resolution</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="secondary" className="flex-col h-auto py-4">
              <FiUsers className="w-6 h-6 mb-2" />
              <span>Manage Users</span>
            </Button>
            <Button variant="secondary" className="flex-col h-auto py-4">
              <FiSettings className="w-6 h-6 mb-2" />
              <span>System Settings</span>
            </Button>
            <Button variant="secondary" className="flex-col h-auto py-4">
              <FiDatabase className="w-6 h-6 mb-2" />
              <span>Backup Data</span>
            </Button>
            <Button variant="secondary" className="flex-col h-auto py-4">
              <FiShield className="w-6 h-6 mb-2" />
              <span>Audit Logs</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader title="Recent Users" subtitle="Newly registered users" />
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentUsers.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={user.role === 'vendor' ? 'info' : 'success'}
                      size="sm"
                    >
                      {user.role}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">{user.joinedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader title="System Activity" subtitle="Sync queue status" />
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-6 text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {systemStats.syncErrors > 0 ? `${systemStats.syncErrors} Sync Errors` : 'All Systems Normal'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Data syncs automatically between IndexedDB and MongoDB when online
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approvals */}
      {systemStats.pendingApprovals > 0 && (
        <Card className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 text-white rounded-lg">
                <FiUserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {systemStats.pendingApprovals} Pending Approvals
                </p>
                <p className="text-sm text-gray-500">New user registrations awaiting approval</p>
              </div>
            </div>
            <Button>Review Now</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
