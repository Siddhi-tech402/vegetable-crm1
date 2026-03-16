import {
  getDB,
  generateLocalId,
  getPendingSyncItems,
  getSyncQueueStats,
  updateSyncQueueItem,
  removeSyncQueueDuplicates,
  clearSyncedItems,
  getSyncQueueItems,
  type SyncQueueItem,
  type SyncQueueStatus,
} from './db';
import toast from 'react-hot-toast';

export type SyncServiceStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncState {
  status: SyncServiceStatus;
  lastSyncAt: Date | null;
  pendingCount: number;
  failedCount: number;
  error: string | null;
}

class SyncService {
  private state: SyncState = {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    failedCount: 0,
    error: null,
  };
  private listeners: Set<(state: SyncState) => void> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private pendingCheckInterval: NodeJS.Timeout | null = null;

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  private setState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  async startAutoSync(intervalMs: number = 30000): Promise<void> {
    this.stopAutoSync();

    // Initial sync
    await this.syncAll();

    // Periodic sync (push + pull)
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && this.state.status !== 'syncing') {
        await this.syncAll();
      }
    }, intervalMs);

    // Periodic retry of failed items with exponential backoff
    this.retryInterval = setInterval(async () => {
      if (navigator.onLine && this.state.failedCount > 0) {
        await this.retryFailedItems();
      }
    }, 10000); // Check every 10s

    // Update pending count every 5s
    this.pendingCheckInterval = setInterval(async () => {
      const stats = await getSyncQueueStats();
      this.setState({ pendingCount: stats.pending, failedCount: stats.failed });
    }, 5000);

    // Cleanup old synced items every hour
    this.cleanupInterval = setInterval(async () => {
      await clearSyncedItems(7);
    }, 3600000);

    // Listen for online event
    window.addEventListener('online', this.handleOnline);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    if (this.pendingCheckInterval) {
      clearInterval(this.pendingCheckInterval);
      this.pendingCheckInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    window.removeEventListener('online', this.handleOnline);
  }

  private handleOnline = async (): Promise<void> => {
    toast.success('Back online! Syncing data...');
    await this.syncAll();
  };

  /**
   * Full sync: dedup → push local → pull from server
   */
  async syncAll(): Promise<void> {
    if (!navigator.onLine) {
      this.setState({ status: 'idle', error: 'Offline' });
      return;
    }

    if (this.state.status === 'syncing') {
      return;
    }

    try {
      this.setState({ status: 'syncing', error: null });

      // Step 1: Remove duplicate queue entries
      const dupsRemoved = await removeSyncQueueDuplicates();
      if (dupsRemoved > 0) {
        console.log(`[Sync] Removed ${dupsRemoved} duplicate queue entries`);
      }

      // Step 2: Push local changes to server (priority-ordered)
      const pushResult = await this.processSyncQueue();

      // Step 3: Pull data from server
      await this.pullFromServer();

      // Step 4: Update stats
      const stats = await getSyncQueueStats();

      this.setState({
        status: pushResult.failed > 0 ? 'error' : 'success',
        lastSyncAt: new Date(),
        pendingCount: stats.pending,
        failedCount: stats.failed,
        error: pushResult.failed > 0 ? `${pushResult.failed} items failed to sync` : null,
      });

      if (pushResult.synced > 0) {
        toast.success(`Synced ${pushResult.synced} items successfully`);
      }

      if (pushResult.failed > 0) {
        toast.error(`${pushResult.failed} items failed to sync`);
        // Schedule retry with delay
        setTimeout(() => this.retryFailedItems(), 5000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      this.setState({ status: 'error', error: 'Sync failed' });
    }
  }

  /**
   * Process all pending items in priority order.
   */
  async processSyncQueue(): Promise<{ synced: number; failed: number; total: number }> {
    const pendingItems = await getPendingSyncItems();
    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        await this.processQueueItem(item);
        synced++;
      } catch (error) {
        console.error('Sync error for item:', item.id, error);
        failed++;
      }
    }

    return { synced, failed, total: pendingItems.length };
  }

  /**
   * Process a single sync queue item with status tracking.
   */
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const apiEndpoints: Record<string, string> = {
      farmers: '/api/farmers',
      customers: '/api/customers',
      vegetables: '/api/vegetables',
      salesBills: '/api/sales-bills',
      payments: '/api/payments',
      supplyEntries: '/api/supply-entries',
    };

    const endpoint = apiEndpoints[item.storeName];
    if (!endpoint) {
      // Unknown store — mark as synced to clear it
      await updateSyncQueueItem(item.id, {
        status: 'synced',
        syncedAt: new Date().toISOString(),
      });
      return;
    }

    // Mark as syncing
    await updateSyncQueueItem(item.id, {
      status: 'syncing',
      lastAttempt: new Date().toISOString(),
    });

    let response: Response;

    try {
      switch (item.operation) {
        case 'create':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          break;

        case 'update':
          response = await fetch(`${endpoint}/${item.data._id || item.data.localId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          break;

        case 'delete':
          response = await fetch(`${endpoint}/${item.data._id || item.data.localId}`, {
            method: 'DELETE',
          });
          break;

        default:
          throw new Error(`Unknown operation: ${item.operation}`);
      }

      if (!response.ok) {
        // For delete operations, 404 means it's already gone from server — treat as success
        if (item.operation === 'delete' && response.status === 404) {
          // Record doesn't exist on server, nothing to delete — that's fine
        } else {
          const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
          throw new Error(error.message || `HTTP ${response.status}`);
        }
      }

      // If create, update local record with server ID
      if (item.operation === 'create') {
        const result = await response.json();
        // Extract _id from response — APIs may return { entity: { _id } } or { _id }
        const serverId = result._id || result.id 
          || result.salesBill?._id || result.payment?._id 
          || result.farmer?._id || result.customer?._id 
          || result.vegetable?._id || result.supplyEntry?._id;
        const db = await getDB();
        const record = await db.get(item.storeName as any, item.data.localId);
        if (record && serverId) {
          (record as any)._id = serverId;
          (record as any).syncStatus = 'synced';
          await db.put(item.storeName as any, record as any);
        }
      }

      // Mark as synced
      await updateSyncQueueItem(item.id, {
        status: 'synced',
        syncedAt: new Date().toISOString(),
      });

      // Remove from queue
      const db = await getDB();
      await db.delete('syncQueue', item.id);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const retries = item.retryCount + 1;
      const shouldRetry = retries < (item.maxRetries || 5);

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const backoffDelay = Math.min(1000 * Math.pow(2, retries), 16000);
      const nextRetryAt = shouldRetry
        ? new Date(Date.now() + backoffDelay).toISOString()
        : undefined;

      await updateSyncQueueItem(item.id, {
        status: 'failed',
        retryCount: retries,
        errorMessage,
        nextRetryAt,
        lastAttempt: new Date().toISOString(),
      });

      // If max retries exceeded, mark local record as conflict
      if (!shouldRetry) {
        await this.markAsConflict(item);
      }

      throw error;
    }
  }

  /**
   * Retry failed items that are ready for retry (exponential backoff elapsed).
   */
  async retryFailedItems(): Promise<number> {
    if (!navigator.onLine) return 0;

    const now = new Date().toISOString();
    const db = await getDB();
    const allItems = await db.getAll('syncQueue');

    const readyItems = allItems.filter((item) => {
      if (item.status !== 'failed') return false;
      if (item.retryCount >= (item.maxRetries || 5)) return false;
      return !item.nextRetryAt || item.nextRetryAt <= now;
    });

    let retried = 0;
    for (const item of readyItems) {
      try {
        await this.processQueueItem(item);
        retried++;
      } catch {
        // Already handled in processQueueItem
      }
    }

    if (retried > 0) {
      const stats = await getSyncQueueStats();
      this.setState({ pendingCount: stats.pending, failedCount: stats.failed });
    }

    return retried;
  }

  private async markAsConflict(item: SyncQueueItem): Promise<void> {
    const db = await getDB();
    const record = await db.get(item.storeName as any, item.data.localId);
    if (record) {
      (record as any).syncStatus = 'conflict';
      await db.put(item.storeName as any, record as any);
    }
  }

  async getPendingCount(): Promise<number> {
    const stats = await getSyncQueueStats();
    return stats.pending;
  }

  async getFailedCount(): Promise<number> {
    const stats = await getSyncQueueStats();
    return stats.failed;
  }

  async getQueueStats() {
    return getSyncQueueStats();
  }

  async getQueueItems(statusFilter?: SyncQueueStatus[]) {
    return getSyncQueueItems(statusFilter);
  }

  async clearSyncQueue(): Promise<void> {
    const db = await getDB();
    await db.clear('syncQueue');
    this.setState({ pendingCount: 0, failedCount: 0 });
  }

  async clearOldSyncedItems(olderThanDays: number = 7): Promise<number> {
    return clearSyncedItems(olderThanDays);
  }

  async clearFailedItems(): Promise<number> {
    const db = await getDB();
    const allItems = await db.getAll('syncQueue');
    let deleted = 0;
    for (const item of allItems) {
      if (item.status === 'failed') {
        await db.delete('syncQueue', item.id);
        deleted++;
      }
    }
    const stats = await this.getQueueStats();
    this.setState({ pendingCount: stats.pending, failedCount: stats.failed });
    return deleted;
  }

  /**
   * Sync a single item by its queue ID (for manual retry from UI).
   */
  async syncSingleItem(itemId: string): Promise<boolean> {
    const db = await getDB();
    const item = await db.get('syncQueue', itemId);
    if (!item) return false;

    try {
      await this.processQueueItem(item);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pull data from server and upsert locally (only non-pending records).
   */
  async pullFromServer(): Promise<void> {
    if (!navigator.onLine) return;

    const storeConfigs: Array<{ storeName: string; endpoint: string; responseKey: string }> = [
      { storeName: 'farmers', endpoint: '/api/farmers?limit=1000', responseKey: 'farmers' },
      { storeName: 'customers', endpoint: '/api/customers?limit=1000', responseKey: 'customers' },
      { storeName: 'vegetables', endpoint: '/api/vegetables?limit=1000', responseKey: 'vegetables' },
      { storeName: 'salesBills', endpoint: '/api/sales-bills?limit=1000', responseKey: 'bills' },
      { storeName: 'payments', endpoint: '/api/payments?limit=1000', responseKey: 'payments' },
      { storeName: 'supplyEntries', endpoint: '/api/supply-entries?limit=1000', responseKey: 'supplyEntries' },
    ];

    for (const { storeName, endpoint, responseKey } of storeConfigs) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;

        const data = await response.json();
        // Extract items array from paginated response shape: { [responseKey]: [...], pagination: {...} }
        const items = Array.isArray(data) ? data : data[responseKey] || data.data || [];
        if (!Array.isArray(items)) continue;

        const db = await getDB();

        for (const serverItem of items) {
          const localId = serverItem.localId || `server_${serverItem._id}`;
          const existingRecord = await db.get(storeName as any, localId);

          // Only update if not pending sync (preserve local changes)
          if (!existingRecord || existingRecord.syncStatus === 'synced') {
            await db.put(storeName as any, {
              ...serverItem,
              localId,
              syncStatus: 'synced',
            });
          }
        }
      } catch (error) {
        console.error(`Error pulling ${storeName}:`, error);
      }
    }
  }
}

export const syncService = new SyncService();
export default syncService;
