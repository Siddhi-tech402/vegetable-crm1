/**
 * Online-first data service.
 * When online → API calls directly to MongoDB.
 * When offline → falls back to IndexedDB offline stores.
 * After successful API call, also mirrors data to IndexedDB for offline access.
 */

import {
  farmersStore,
  customersStore,
  vegetablesStore,
  salesBillsStore,
  paymentsStore,
  supplyEntriesStore,
} from '@/offline';

// ── Generic API helpers ──────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// ── Customers ────────────────────────────────────────────────────────

export async function fetchCustomers(params?: Record<string, string>) {
  if (isOnline()) {
    try {
      const qs = new URLSearchParams({ limit: '1000', ...params }).toString();
      const data = await apiFetch<any>(`/api/customers?${qs}`);
      const items = data.customers || [];
      // Mirror to IndexedDB
      for (const item of items) {
        try {
          const db = (await import('@/offline')).getDB;
          const idb = await db();
          const localId = item.localId || `server_${item._id}`;
          await idb.put('customers', { ...item, localId, syncStatus: 'synced' });
        } catch {}
      }
      return items;
    } catch (err) {
      console.warn('API fetch customers failed, falling back to IndexedDB:', err);
    }
  }
  return customersStore.getAll();
}

export async function createCustomer(data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const customer = result.customer;
      // Mirror to IndexedDB
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = customer.localId || `server_${customer._id}`;
        await idb.put('customers', { ...customer, localId, syncStatus: 'synced' });
      } catch {}
      return customer;
    } catch (err: any) {
      console.error('API create customer failed:', err);
      throw err;
    }
  }
  // Offline fallback
  return customersStore.add(data);
}

export async function updateCustomer(id: string, data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const customer = result.customer;
      // Mirror to IndexedDB
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = customer.localId || `server_${customer._id}`;
        const existing = await idb.get('customers', localId);
        await idb.put('customers', { ...(existing || {}), ...customer, localId, syncStatus: 'synced' });
      } catch {}
      return customer;
    } catch (err: any) {
      console.error('API update customer failed:', err);
      throw err;
    }
  }
  return customersStore.update(id, data);
}

export async function deleteCustomer(id: string) {
  if (isOnline()) {
    try {
      await apiFetch<any>(`/api/customers/${id}`, { method: 'DELETE' });
      // Remove from IndexedDB too
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        // Try to find and delete by server ID
        const all = await idb.getAll('customers');
        const match = all.find((c: any) => c._id === id || c.localId === id);
        if (match) await idb.delete('customers', match.localId);
      } catch {}
      return true;
    } catch (err: any) {
      console.error('API delete customer failed:', err);
      throw err;
    }
  }
  return customersStore.delete(id);
}

// ── Farmers ──────────────────────────────────────────────────────────

export async function fetchFarmers(params?: Record<string, string>) {
  if (isOnline()) {
    try {
      const qs = new URLSearchParams({ limit: '1000', ...params }).toString();
      const data = await apiFetch<any>(`/api/farmers?${qs}`);
      const items = data.farmers || [];
      for (const item of items) {
        try {
          const db = (await import('@/offline')).getDB;
          const idb = await db();
          const localId = item.localId || `server_${item._id}`;
          await idb.put('farmers', { ...item, localId, syncStatus: 'synced' });
        } catch {}
      }
      return items;
    } catch (err) {
      console.warn('API fetch farmers failed, falling back to IndexedDB:', err);
    }
  }
  return farmersStore.getAll();
}

export async function createFarmer(data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>('/api/farmers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const farmer = result.farmer;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = farmer.localId || `server_${farmer._id}`;
        await idb.put('farmers', { ...farmer, localId, syncStatus: 'synced' });
      } catch {}
      return farmer;
    } catch (err: any) {
      console.error('API create farmer failed:', err);
      throw err;
    }
  }
  return farmersStore.add(data);
}

export async function updateFarmer(id: string, data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>(`/api/farmers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const farmer = result.farmer;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = farmer.localId || `server_${farmer._id}`;
        const existing = await idb.get('farmers', localId);
        await idb.put('farmers', { ...(existing || {}), ...farmer, localId, syncStatus: 'synced' });
      } catch {}
      return farmer;
    } catch (err: any) {
      console.error('API update farmer failed:', err);
      throw err;
    }
  }
  return farmersStore.update(id, data);
}

export async function deleteFarmer(id: string) {
  if (isOnline()) {
    try {
      await apiFetch<any>(`/api/farmers/${id}`, { method: 'DELETE' });
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const all = await idb.getAll('farmers');
        const match = all.find((c: any) => c._id === id || c.localId === id);
        if (match) await idb.delete('farmers', match.localId);
      } catch {}
      return true;
    } catch (err: any) {
      console.error('API delete farmer failed:', err);
      throw err;
    }
  }
  return farmersStore.delete(id);
}

// ── Vegetables ───────────────────────────────────────────────────────

export async function fetchVegetables(params?: Record<string, string>) {
  if (isOnline()) {
    try {
      const qs = new URLSearchParams({ limit: '1000', ...params }).toString();
      const data = await apiFetch<any>(`/api/vegetables?${qs}`);
      const items = data.vegetables || [];
      for (const item of items) {
        try {
          const db = (await import('@/offline')).getDB;
          const idb = await db();
          const localId = item.localId || `server_${item._id}`;
          await idb.put('vegetables', { ...item, localId, syncStatus: 'synced' });
        } catch {}
      }
      return items;
    } catch (err) {
      console.warn('API fetch vegetables failed, falling back to IndexedDB:', err);
    }
  }
  return vegetablesStore.getAll();
}

export async function createVegetable(data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>('/api/vegetables', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const vegetable = result.vegetable;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = vegetable.localId || `server_${vegetable._id}`;
        await idb.put('vegetables', { ...vegetable, localId, syncStatus: 'synced' });
      } catch {}
      return vegetable;
    } catch (err: any) {
      console.error('API create vegetable failed:', err);
      throw err;
    }
  }
  return vegetablesStore.add(data);
}

export async function updateVegetable(id: string, data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>(`/api/vegetables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const vegetable = result.vegetable;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = vegetable.localId || `server_${vegetable._id}`;
        const existing = await idb.get('vegetables', localId);
        await idb.put('vegetables', { ...(existing || {}), ...vegetable, localId, syncStatus: 'synced' });
      } catch {}
      return vegetable;
    } catch (err: any) {
      console.error('API update vegetable failed:', err);
      throw err;
    }
  }
  return vegetablesStore.update(id, data);
}

export async function deleteVegetable(id: string) {
  if (isOnline()) {
    try {
      await apiFetch<any>(`/api/vegetables/${id}`, { method: 'DELETE' });
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const all = await idb.getAll('vegetables');
        const match = all.find((c: any) => c._id === id || c.localId === id);
        if (match) await idb.delete('vegetables', match.localId);
      } catch {}
      return true;
    } catch (err: any) {
      console.error('API delete vegetable failed:', err);
      throw err;
    }
  }
  return vegetablesStore.delete(id);
}

// ── Sales Bills ──────────────────────────────────────────────────────

export async function fetchSalesBills(params?: Record<string, string>) {
  if (isOnline()) {
    try {
      const qs = new URLSearchParams({ limit: '1000', ...params }).toString();
      const data = await apiFetch<any>(`/api/sales-bills?${qs}`);
      const items = data.bills || [];
      for (const item of items) {
        try {
          const db = (await import('@/offline')).getDB;
          const idb = await db();
          const localId = item.localId || `server_${item._id}`;
          await idb.put('salesBills', { ...item, localId, syncStatus: 'synced' });
        } catch {}
      }
      return items;
    } catch (err) {
      console.warn('API fetch sales bills failed, falling back to IndexedDB:', err);
    }
  }
  return salesBillsStore.getAll();
}

export async function createSalesBill(data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>('/api/sales-bills', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const bill = result.salesBill;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = bill.localId || `server_${bill._id}`;
        await idb.put('salesBills', { ...bill, localId, syncStatus: 'synced' });
      } catch {}
      return bill;
    } catch (err: any) {
      console.error('API create sales bill failed:', err);
      throw err;
    }
  }
  return salesBillsStore.add(data);
}

// ── Payments ─────────────────────────────────────────────────────────

export async function fetchPayments(params?: Record<string, string>) {
  if (isOnline()) {
    try {
      const qs = new URLSearchParams({ limit: '1000', ...params }).toString();
      const data = await apiFetch<any>(`/api/payments?${qs}`);
      const items = data.payments || [];
      for (const item of items) {
        try {
          const db = (await import('@/offline')).getDB;
          const idb = await db();
          const localId = item.localId || `server_${item._id}`;
          await idb.put('payments', { ...item, localId, syncStatus: 'synced' });
        } catch {}
      }
      return items;
    } catch (err) {
      console.warn('API fetch payments failed, falling back to IndexedDB:', err);
    }
  }
  return paymentsStore.getAll();
}

export async function createPayment(data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payment = result.payment;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = payment.localId || `server_${payment._id}`;
        await idb.put('payments', { ...payment, localId, syncStatus: 'synced' });
      } catch {}
      return payment;
    } catch (err: any) {
      console.error('API create payment failed:', err);
      throw err;
    }
  }
  return paymentsStore.add(data);
}

// ── Supply Entries ───────────────────────────────────────────────────

export async function fetchSupplyEntries(params?: Record<string, string>) {
  if (isOnline()) {
    try {
      const qs = new URLSearchParams({ limit: '1000', ...params }).toString();
      const data = await apiFetch<any>(`/api/supply-entries?${qs}`);
      const items = data.supplyEntries || [];
      for (const item of items) {
        try {
          const db = (await import('@/offline')).getDB;
          const idb = await db();
          const localId = item.localId || `server_${item._id}`;
          await idb.put('supplyEntries', { ...item, localId, syncStatus: 'synced' });
        } catch {}
      }
      return items;
    } catch (err) {
      console.warn('API fetch supply entries failed, falling back to IndexedDB:', err);
    }
  }
  return supplyEntriesStore.getAll();
}

export async function createSupplyEntry(data: any) {
  if (isOnline()) {
    try {
      const result = await apiFetch<any>('/api/supply-entries', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const entry = result.supplyEntry;
      try {
        const db = (await import('@/offline')).getDB;
        const idb = await db();
        const localId = entry.localId || `server_${entry._id}`;
        await idb.put('supplyEntries', { ...entry, localId, syncStatus: 'synced' });
      } catch {}
      return entry;
    } catch (err: any) {
      console.error('API create supply entry failed:', err);
      throw err;
    }
  }
  return supplyEntriesStore.add(data);
}
