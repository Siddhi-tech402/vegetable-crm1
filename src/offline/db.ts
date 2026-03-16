import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Sync queue item status
export type SyncQueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';

// Sync queue item interface (enhanced)
export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  storeName: string;
  entityType: string;
  entityId: string;
  data: any;
  status: SyncQueueStatus;
  priority: number;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  nextRetryAt?: string;
  lastAttempt?: string;
  syncedAt?: string;
}

// Priority mapping for sync order (higher = first)
export const SYNC_PRIORITY: Record<string, number> = {
  salesBills: 3,
  payments: 2,
  farmers: 1,
  customers: 1,
  vegetables: 1,
  supplyEntries: 1,
};

// Database schema types
interface VegCRMDBSchema extends DBSchema {
  farmers: {
    key: string;
    value: {
      _id?: string;
      localId: string;
      code: string;
      name: string;
      phone: string;
      email?: string;
      address: string;
      village?: string;
      district?: string;
      state?: string;
      pincode?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      cropTypes: string[];
      openingBalance: number;
      balanceType: 'Cr' | 'Dr';
      currentBalance: number;
      isActive: boolean;
      syncStatus: 'synced' | 'pending' | 'conflict';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-code': string;
      'by-syncStatus': string;
      'by-name': string;
    };
  };
  customers: {
    key: string;
    value: {
      _id?: string;
      localId: string;
      code: string;
      name: string;
      phone: string;
      email?: string;
      address: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstNumber?: string;
      commissionRate: number;
      hamaliCharge: number;
      marketFeeRate: number;
      openingBalance: number;
      balanceType: 'Cr' | 'Dr';
      currentBalance: number;
      creditLimit?: number;
      isActive: boolean;
      syncStatus: 'synced' | 'pending' | 'conflict';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-code': string;
      'by-syncStatus': string;
      'by-name': string;
    };
  };
  vegetables: {
    key: string;
    value: {
      _id?: string;
      localId: string;
      code: string;
      name: string;
      localName?: string;
      category: string;
      unit: string;
      defaultPrice?: number;
      isActive: boolean;
      syncStatus: 'synced' | 'pending' | 'conflict';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-code': string;
      'by-syncStatus': string;
      'by-category': string;
    };
  };
  salesBills: {
    key: string;
    value: {
      _id?: string;
      localId: string;
      billNumber: string;
      billDate: string;
      farmerId: string;
      farmerName: string;
      farmerCode: string;
      buyers: any[];
      vehicleNumber?: string;
      gatePassNumber?: string;
      bags?: number;
      totalSaleAmount: number;
      totalCommission: number;
      totalMarketFee: number;
      totalHamali: number;
      totalDeductions: number;
      netPayableToFarmer: number;
      transportation?: number;
      localTransportation?: number;
      otherCharges?: number;
      financialYear: string;
      status: string;
      paidAmount: number;
      pendingAmount: number;
      remarks?: string;
      createdBy: string;
      syncStatus: 'synced' | 'pending' | 'conflict';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-billNumber': string;
      'by-syncStatus': string;
      'by-farmerId': string;
      'by-financialYear': string;
      'by-billDate': string;
    };
  };
  payments: {
    key: string;
    value: {
      _id?: string;
      localId: string;
      voucherNumber: string;
      voucherDate: string;
      type: 'receipt' | 'payment';
      customerId?: string;
      customerName?: string;
      customerCode?: string;
      farmerId?: string;
      farmerName?: string;
      farmerCode?: string;
      billId?: string;
      billNumber?: string;
      amount: number;
      paymentMode: string;
      chequeNumber?: string;
      chequeDate?: string;
      bankName?: string;
      upiReference?: string;
      kasar: number;
      netAmount: number;
      narration?: string;
      financialYear: string;
      status: string;
      createdBy: string;
      syncStatus: 'synced' | 'pending' | 'conflict';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-voucherNumber': string;
      'by-syncStatus': string;
      'by-type': string;
      'by-financialYear': string;
      'by-voucherDate': string;
    };
  };
  supplyEntries: {
    key: string;
    value: {
      _id?: string;
      localId: string;
      entryDate: string;
      farmerId: string;
      farmerName: string;
      farmerCode: string;
      vegetableId: string;
      vegetableName: string;
      quantity: number;
      unit: string;
      expectedPrice: number;
      expectedAmount: number;
      status: string;
      soldQuantity: number;
      remarks?: string;
      financialYear: string;
      syncStatus: 'synced' | 'pending' | 'conflict';
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      'by-syncStatus': string;
      'by-farmerId': string;
      'by-financialYear': string;
      'by-entryDate': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-storeName': string;
      'by-timestamp': string;
      'by-status': SyncQueueStatus;
      'by-priority': number;
    };
  };
}

const DB_NAME = 'VegCRM';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<VegCRMDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<VegCRMDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<VegCRMDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // Farmers store
      if (!db.objectStoreNames.contains('farmers')) {
        const farmersStore = db.createObjectStore('farmers', { keyPath: 'localId' });
        farmersStore.createIndex('by-code', 'code', { unique: true });
        farmersStore.createIndex('by-syncStatus', 'syncStatus');
        farmersStore.createIndex('by-name', 'name');
      }

      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const customersStore = db.createObjectStore('customers', { keyPath: 'localId' });
        customersStore.createIndex('by-code', 'code', { unique: true });
        customersStore.createIndex('by-syncStatus', 'syncStatus');
        customersStore.createIndex('by-name', 'name');
      }

      // Vegetables store
      if (!db.objectStoreNames.contains('vegetables')) {
        const vegetablesStore = db.createObjectStore('vegetables', { keyPath: 'localId' });
        vegetablesStore.createIndex('by-code', 'code', { unique: true });
        vegetablesStore.createIndex('by-syncStatus', 'syncStatus');
        vegetablesStore.createIndex('by-category', 'category');
      }

      // Sales Bills store
      if (!db.objectStoreNames.contains('salesBills')) {
        const salesBillsStore = db.createObjectStore('salesBills', { keyPath: 'localId' });
        salesBillsStore.createIndex('by-billNumber', 'billNumber', { unique: true });
        salesBillsStore.createIndex('by-syncStatus', 'syncStatus');
        salesBillsStore.createIndex('by-farmerId', 'farmerId');
        salesBillsStore.createIndex('by-financialYear', 'financialYear');
        salesBillsStore.createIndex('by-billDate', 'billDate');
      }

      // Payments store
      if (!db.objectStoreNames.contains('payments')) {
        const paymentsStore = db.createObjectStore('payments', { keyPath: 'localId' });
        paymentsStore.createIndex('by-voucherNumber', 'voucherNumber', { unique: true });
        paymentsStore.createIndex('by-syncStatus', 'syncStatus');
        paymentsStore.createIndex('by-type', 'type');
        paymentsStore.createIndex('by-financialYear', 'financialYear');
        paymentsStore.createIndex('by-voucherDate', 'voucherDate');
      }

      // Supply Entries store
      if (!db.objectStoreNames.contains('supplyEntries')) {
        const supplyEntriesStore = db.createObjectStore('supplyEntries', { keyPath: 'localId' });
        supplyEntriesStore.createIndex('by-syncStatus', 'syncStatus');
        supplyEntriesStore.createIndex('by-farmerId', 'farmerId');
        supplyEntriesStore.createIndex('by-financialYear', 'financialYear');
        supplyEntriesStore.createIndex('by-entryDate', 'entryDate');
      }

      // Sync Queue store — enhanced in v2 with status & priority indexes
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncQueueStore.createIndex('by-storeName', 'storeName');
        syncQueueStore.createIndex('by-timestamp', 'timestamp');
        syncQueueStore.createIndex('by-status', 'status');
        syncQueueStore.createIndex('by-priority', 'priority');
      } else if (oldVersion < 2) {
        // Upgrade existing syncQueue store with new indexes
        const syncStore = transaction.objectStore('syncQueue');
        if (!syncStore.indexNames.contains('by-status')) {
          syncStore.createIndex('by-status', 'status');
        }
        if (!syncStore.indexNames.contains('by-priority')) {
          syncStore.createIndex('by-priority', 'priority');
        }
      }
    },
  });

  return dbInstance;
}

// Generate unique local ID
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generic CRUD operations for offline-first
export class OfflineStore<T extends { localId: string; syncStatus: string }> {
  private storeName: keyof VegCRMDBSchema;

  constructor(storeName: keyof VegCRMDBSchema) {
    this.storeName = storeName;
  }

  async getAll(): Promise<T[]> {
    const db = await getDB();
    return db.getAll(this.storeName as any) as Promise<T[]>;
  }

  async getById(localId: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get(this.storeName as any, localId) as Promise<T | undefined>;
  }

  async add(data: Omit<T, 'localId' | 'syncStatus'>): Promise<T> {
    const db = await getDB();
    const record = {
      ...data,
      localId: generateLocalId(),
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as T;

    await db.add(this.storeName as any, record as any);
    await this.addToSyncQueue('create', record);
    return record;
  }

  async update(localId: string, data: Partial<T>): Promise<T | undefined> {
    const db = await getDB();
    const existing = await this.getById(localId);
    
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...data,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
    } as T;

    await db.put(this.storeName as any, updated as any);
    await this.addToSyncQueue('update', updated);
    return updated;
  }

  async delete(localId: string): Promise<boolean> {
    const db = await getDB();
    const existing = await this.getById(localId);
    
    if (!existing) return false;

    await db.delete(this.storeName as any, localId);
    await this.addToSyncQueue('delete', existing);
    return true;
  }

  async getPending(): Promise<T[]> {
    const db = await getDB();
    const tx = db.transaction(this.storeName as any, 'readonly');
    const store = tx.objectStore(this.storeName as any) as any;
    const index = store.index('by-syncStatus');
    return index.getAll('pending') as Promise<T[]>;
  }

  async markAsSynced(localId: string, serverId: string): Promise<void> {
    const db = await getDB();
    const record = await this.getById(localId);
    if (record) {
      (record as any)._id = serverId;
      record.syncStatus = 'synced';
      await db.put(this.storeName as any, record as any);
    }
  }

  private async addToSyncQueue(operation: 'create' | 'update' | 'delete', data: T): Promise<void> {
    const db = await getDB();
    const storeName = this.storeName as string;
    const priority = SYNC_PRIORITY[storeName] || 1;
    await db.add('syncQueue', {
      id: generateLocalId(),
      operation,
      storeName,
      entityType: storeName,
      entityId: (data as any).localId || generateLocalId(),
      data,
      status: 'pending',
      priority,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5,
    });
  }
}

// ── Sync Queue Helpers ──────────────────────────────────────────────────

/**
 * Get priority-ordered pending/failed items ready for sync.
 * Items with more retries than maxRetries are excluded.
 * Failed items with a nextRetryAt in the future are excluded.
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const allItems = await db.getAll('syncQueue');
  const now = new Date().toISOString();

  const readyItems = allItems.filter((item) => {
    if (item.status === 'synced') return false;
    if (item.status === 'failed' && item.retryCount >= (item.maxRetries || 5)) return false;
    if (item.status === 'pending') return true;
    if (item.status === 'failed') {
      return !item.nextRetryAt || item.nextRetryAt <= now;
    }
    return false;
  });

  // Sort by priority desc, then timestamp asc
  return readyItems.sort((a, b) => {
    if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
    return a.timestamp.localeCompare(b.timestamp);
  });
}

/**
 * Get sync queue statistics.
 */
export async function getSyncQueueStats(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
  total: number;
}> {
  const db = await getDB();
  const allItems = await db.getAll('syncQueue');

  const counts = { pending: 0, syncing: 0, failed: 0, synced: 0, total: allItems.length };
  for (const item of allItems) {
    if (item.status in counts) {
      counts[item.status as keyof typeof counts]++;
    }
  }
  return counts;
}

/**
 * Update a sync queue item's status and metadata.
 */
export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    await db.put('syncQueue', { ...item, ...updates });
  }
}

/**
 * Remove duplicate sync queue entries (keep newest per storeName+entityId+operation).
 */
export async function removeSyncQueueDuplicates(): Promise<number> {
  const db = await getDB();
  const allItems = await db.getAll('syncQueue');

  const activeItems = allItems.filter((i) => i.status === 'pending' || i.status === 'failed');
  const seen = new Map<string, SyncQueueItem>();
  const duplicateIds: string[] = [];

  for (const item of activeItems) {
    const key = `${item.storeName}:${item.entityId}:${item.operation}`;
    const existing = seen.get(key);
    if (existing) {
      // Keep the newer one
      if (item.timestamp > existing.timestamp) {
        duplicateIds.push(existing.id);
        seen.set(key, item);
      } else {
        duplicateIds.push(item.id);
      }
    } else {
      seen.set(key, item);
    }
  }

  for (const id of duplicateIds) {
    await db.delete('syncQueue', id);
  }
  return duplicateIds.length;
}

/**
 * Clear synced items older than specified days.
 */
export async function clearSyncedItems(olderThanDays: number = 7): Promise<number> {
  const db = await getDB();
  const allItems = await db.getAll('syncQueue');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = cutoff.toISOString();

  let deleted = 0;
  for (const item of allItems) {
    if (item.status === 'synced') {
      const syncTime = item.syncedAt || item.timestamp;
      if (syncTime < cutoffStr || olderThanDays === 0) {
        await db.delete('syncQueue', item.id);
        deleted++;
      }
    }
  }
  return deleted;
}

/**
 * Get all sync queue items matching a status filter.
 */
export async function getSyncQueueItems(statusFilter?: SyncQueueStatus[]): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const allItems = await db.getAll('syncQueue');
  if (!statusFilter) return allItems;
  return allItems.filter((item) => statusFilter.includes(item.status));
}

// Store instances
export const farmersStore = new OfflineStore<VegCRMDBSchema['farmers']['value']>('farmers');
export const customersStore = new OfflineStore<VegCRMDBSchema['customers']['value']>('customers');
export const vegetablesStore = new OfflineStore<VegCRMDBSchema['vegetables']['value']>('vegetables');
export const salesBillsStore = new OfflineStore<VegCRMDBSchema['salesBills']['value']>('salesBills');
export const paymentsStore = new OfflineStore<VegCRMDBSchema['payments']['value']>('payments');
export const supplyEntriesStore = new OfflineStore<VegCRMDBSchema['supplyEntries']['value']>('supplyEntries');
