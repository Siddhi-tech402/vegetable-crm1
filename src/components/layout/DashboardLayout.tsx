'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiMenu,
  FiX,
  FiHome,
  FiUsers,
  FiShoppingBag,
  FiFileText,
  FiDollarSign,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiSun,
  FiMoon,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiUser,
  FiPackage,
  FiTruck,
  FiCreditCard,
} from 'react-icons/fi';
import { useTheme } from '@/hooks/useTheme';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { syncService } from '@/offline';
import SyncStatusModal from '@/components/ui/SyncStatusModal';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const farmerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/farmer/dashboard', icon: <FiHome /> },
  { label: 'My Profile', href: '/farmer/profile', icon: <FiUser /> },
  { label: 'Sales History', href: '/farmer/sales', icon: <FiFileText /> },
  { label: 'Settlements', href: '/farmer/settlements', icon: <FiDollarSign /> },
  { label: 'Supply Entry', href: '/farmer/supply', icon: <FiPackage /> },
];

const vendorNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/vendor/dashboard', icon: <FiHome /> },
  {
    label: 'Masters',
    href: '/vendor/masters',
    icon: <FiSettings />,
    children: [
      { label: 'Customers', href: '/vendor/masters/customers', icon: <FiUsers /> },
      { label: 'Farmers', href: '/vendor/masters/farmers', icon: <FiTruck /> },
      { label: 'Vegetables', href: '/vendor/masters/vegetables', icon: <FiPackage /> },
    ],
  },
  { label: 'Sales Bill', href: '/vendor/sales', icon: <FiShoppingBag /> },
  { label: 'Cash Book', href: '/vendor/cashbook', icon: <FiCreditCard /> },
  { label: 'Reports', href: '/vendor/reports', icon: <FiBarChart2 /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <FiHome /> },
  { label: 'Users', href: '/admin/users', icon: <FiUsers /> },
  { label: 'Settings', href: '/admin/settings', icon: <FiSettings /> },
  ...vendorNavItems.slice(1),
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { financialYear, financialYears, setFinancialYear, isYearLocked } = useFinancialYear();
  const { isOnline } = useOnlineStatus();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [syncState, setSyncState] = useState({ pendingCount: 0, failedCount: 0, status: 'idle' });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const role = session?.user?.role || 'farmer';

  const navItems =
    role === 'admin' ? adminNavItems : role === 'vendor' ? vendorNavItems : farmerNavItems;

  useEffect(() => {
    // Start auto sync
    syncService.startAutoSync(30000);

    // Subscribe to sync state
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState({ pendingCount: state.pendingCount, failedCount: state.failedCount || 0, status: state.status });
    });

    return () => {
      syncService.stopAutoSync();
      unsubscribe();
    };
  }, []);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSync = () => {
    syncService.syncAll();
  };

  const isActiveLink = (href: string) => {
    if (href === pathname) return true;
    if (pathname.startsWith(href) && href !== '/') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 shadow-md md:hidden">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 touch-target"
          aria-label="Open menu"
        >
          <FiMenu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Vegetable CRM</h1>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <FiWifi className="w-5 h-5 text-green-500" />
          ) : (
            <FiWifiOff className="w-5 h-5 text-red-500" />
          )}
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-lg font-semibold text-gray-800 dark:text-white">Veg CRM</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-semibold">
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
                      expandedMenus.includes(item.label)
                        ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        expandedMenus.includes(item.label) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedMenus.includes(item.label) && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm transition-colors touch-target ${
                            isActiveLink(child.href)
                              ? 'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span>{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
                    isActiveLink(item.href)
                      ? 'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 touch-target"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <FiSun className="w-5 h-5 text-yellow-500" />
              ) : (
                <FiMoon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <FiWifi className="w-4 h-4 text-green-500" />
              ) : (
                <FiWifiOff className="w-4 h-4 text-red-500" />
              )}
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 touch-target"
                aria-label="Open sync status"
              >
                {syncState.pendingCount > 0 && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                    {syncState.pendingCount} pending
                  </span>
                )}
                {syncState.failedCount > 0 && (
                  <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                    {syncState.failedCount} failed
                  </span>
                )}
              </button>
              <button
                onClick={handleSync}
                disabled={!isOnline || syncState.status === 'syncing'}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 touch-target"
                aria-label="Sync data"
              >
                <FiRefreshCw
                  className={`w-4 h-4 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors touch-target"
          >
            <FiLogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {navItems.find(
                (item) =>
                  item.href === pathname ||
                  item.children?.some((child) => child.href === pathname)
              )?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            {/* Financial Year Selector */}
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {financialYears.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy} {isYearLocked(fy) ? '🔒' : ''}
                </option>
              ))}
            </select>

            {/* Sync Status */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <FiWifi className="w-4 h-4 mr-1" />
                  Online
                </span>
              ) : (
                <span className="flex items-center text-sm text-red-600 dark:text-red-400">
                  <FiWifiOff className="w-4 h-4 mr-1" />
                  Offline
                </span>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <FiSun className="w-5 h-5 text-yellow-500" />
              ) : (
                <FiMoon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6">{children}</div>
      </main>

      {/* Sync Status Modal */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </div>
  );
}
