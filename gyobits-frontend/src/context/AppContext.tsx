'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export interface AuditLogItem {
  id: string;
  waktu: string;
  ref: string;
  tipe: 'POS' | 'PURCHASE' | 'YIELD' | 'BATCH' | 'EXPENSE';
  operator: string;
  nominal: number;
  keterangan: string;
}

const DEFAULT_AUDIT_LOGS: AuditLogItem[] = [
  { id: '1', waktu: '06/10/2026, 21.07', ref: 'SALE-20261006-014', tipe: 'POS', operator: 'Kasir Dina', nominal: 35000, keterangan: 'Penjualan POS (Gyoza Isi 10)' },
  { id: '2', waktu: '06/10/2026, 18.30', ref: 'BCH-20261006-001', tipe: 'BATCH', operator: 'Chef Budi', nominal: 99500, keterangan: 'Produksi Batch 28 Pcs Gyoza' },
  { id: '3', waktu: '06/10/2026, 14.15', ref: 'YLD-20261006-001', tipe: 'YIELD', operator: 'Chef Budi', nominal: 380000, keterangan: 'Prep Protein Daging Bersih' },
  { id: '4', waktu: '06/10/2026, 10.00', ref: 'PUR-20261006-002', tipe: 'PURCHASE', operator: 'Owner', nominal: 75000, keterangan: 'Beli Kulit Gyoza 5 Pack' },
  { id: '5', waktu: '05/10/2026, 19.45', ref: 'FIN-OUT-20261005-01', tipe: 'EXPENSE', operator: 'Owner', nominal: 50000, keterangan: 'Biaya Gas Elpiji 12kg' },
];

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  notifications: string[];
  addNotification: (msg: string) => void;
  clearNotifications: () => void;
  unreadCount: number;
  auditLogs: AuditLogItem[];
  addAuditLog: (log: Omit<AuditLogItem, 'id' | 'waktu'> & { waktu?: string }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<string[]>([
    'Selamat datang di GYOBITS POS & Inventory!',
    'Pencatatan shift Sabtu & Minggu siap digunakan.'
  ]);
  const [unreadCount, setUnreadCount] = useState<number>(2);

  // Shared persistent Audit Logs across all pages
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(DEFAULT_AUDIT_LOGS);

  // Load theme and audit logs on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('gyobits_theme') as Theme | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark');
        }
      }

      const savedLogs = localStorage.getItem('gyobits_audit_logs');
      if (savedLogs) {
        try {
          const parsed = JSON.parse(savedLogs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAuditLogs(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('gyobits_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      return next;
    });
  };

  const addAuditLog = (log: Omit<AuditLogItem, 'id' | 'waktu'> & { waktu?: string }) => {
    const now = new Date();
    const timeStr = log.waktu || `${now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    const newEntry: AuditLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      waktu: timeStr,
      ref: log.ref,
      tipe: log.tipe,
      operator: log.operator,
      nominal: log.nominal,
      keterangan: log.keterangan
    };

    setAuditLogs(prev => {
      const updated = [newEntry, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('gyobits_audit_logs', JSON.stringify(updated));
      }
      return updated;
    });

    addNotification(`Aktivitas baru dicatat: ${log.ref} (${log.keterangan})`);
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('stokara_pos_outbox');
        if (saved) {
          const outbox = JSON.parse(saved);
          const pending = outbox.filter((t: any) => t.status === 'PENDING');
          for (const item of pending) {
            try {
              await fetch('/api/sales/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
              });
              item.status = 'SYNCED';
            } catch (err) {
              console.warn('Sync failed for item', item.id, err);
            }
          }
          localStorage.setItem('stokara_pos_outbox', JSON.stringify(outbox));
        }
      }
      addNotification('Semua data offline berhasil disinkronkan ke server!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const clearNotifications = () => {
    setUnreadCount(0);
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      isSyncing,
      syncNow,
      notifications,
      addNotification,
      clearNotifications,
      unreadCount,
      auditLogs,
      addAuditLog,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
