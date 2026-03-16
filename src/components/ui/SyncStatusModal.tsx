'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiX, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';
import { Modal } from '@/components/ui';
import { syncService } from '@/offline';
import type { SyncQueueItem, SyncQueueStatus } from '@/offline';
import toast from 'react-hot-toast';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncStatusModal({ isOpen, onClose }: SyncStatusModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    syncing: 0,
    failed: 0,
    synced: 0,
    total: 0,
  });
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);

  const updateData = useCallback(async () => {
    const [newStats, items] = await Promise.all([
      syncService.getQueueStats(),
      syncService.getQueueItems(['pending', 'syncing', 'failed']),
    ]);
    setStats(newStats);
    // Sort by priority desc, then timestamp
    setQueueItems(
      items.sort((a, b) => {
        if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
        return a.timestamp.localeCompare(b.timestamp);
      })
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateData();
      const interval = setInterval(updateData, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, updateData]);

  // Group items by store name
  const groupedItems = queueItems.reduce((acc, item) => {
    if (!acc[item.storeName]) acc[item.storeName] = [];
    acc[item.storeName].push(item);
    return acc;
  }, {} as Record<string, SyncQueueItem[]>);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncAll();
      toast.success('Sync completed');
      await updateData();
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsSyncing(true);
    try {
      const retried = await syncService.retryFailedItems();
      toast.success(`Retried ${retried} failed items`);
      await updateData();
    } catch {
      toast.error('Retry failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryItem = async (item: SyncQueueItem) => {
    try {
      await syncService.syncSingleItem(item.id);
      toast.success('Item synced');
      await updateData();
    } catch {
      toast.error('Item sync failed');
    }
  };

  const handleClearSynced = async () => {
    try {
      const cleared = await syncService.clearOldSyncedItems(0);
      toast.success(`Cleared ${cleared} synced items`);
      await updateData();
    } catch {
      toast.error('Clear failed');
    }
  };

  const handleClearFailed = async () => {
    try {
      const cleared = await syncService.clearFailedItems();
      toast.success(`Cleared ${cleared} failed items`);
      await updateData();
    } catch {
      toast.error('Clear failed');
    }
  };

  const getStatusBadge = (status: SyncQueueStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            <FiClock className="w-3 h-3" /> Pending
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <FiRefreshCw className="w-3 h-3 animate-spin" /> Syncing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <FiAlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <FiCheckCircle className="w-3 h-3" /> Synced
          </span>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sync Queue Status" size="lg">
      <div className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</p>
          </div>
          <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Syncing</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.syncing}</p>
          </div>
          <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.failed}</p>
          </div>
          <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Synced</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.synced}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing || stats.pending === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync All Now
          </button>
          {stats.failed > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800 disabled:opacity-50"
            >
              <FiRefreshCw className="w-4 h-4" />
              Retry Failed ({stats.failed})
            </button>
          )}
          {stats.failed > 0 && (
            <button
              onClick={handleClearFailed}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiX className="w-4 h-4" />
              Clear Failed ({stats.failed})
            </button>
          )}
          {stats.synced > 0 && (
            <button
              onClick={handleClearSynced}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700"
            >
              <FiX className="w-4 h-4" />
              Clear Synced
            </button>
          )}
        </div>

        {/* Queue Items grouped by store */}
        {Object.keys(groupedItems).length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {Object.entries(groupedItems).map(([storeName, items]) => (
              <div key={storeName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <h3 className="font-semibold text-sm capitalize mb-2 text-gray-800 dark:text-gray-200">
                  {storeName} ({items.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Entity ID</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Operation</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Retries</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Error</th>
                        <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Retry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-600 dark:text-gray-400">
                            {item.entityId?.slice(0, 12) || item.id.slice(0, 12)}...
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {item.operation}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">{getStatusBadge(item.status)}</td>
                          <td className="px-3 py-1.5 text-xs text-gray-500">
                            {item.retryCount}/{item.maxRetries || 5}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-red-500 max-w-[200px] truncate">
                            {item.errorMessage || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {item.status === 'failed' && (
                              <button
                                onClick={() => handleRetryItem(item)}
                                disabled={isSyncing}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                title="Retry this item"
                              >
                                <FiRefreshCw className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <FiCheckCircle className="w-10 h-10 mx-auto mb-2" />
            <p className="font-medium">No pending sync items</p>
            <p className="text-sm">All data is synced!</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
