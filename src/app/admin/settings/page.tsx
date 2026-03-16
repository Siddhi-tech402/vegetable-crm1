'use client';

import { useState } from 'react';
import {
  FiSettings,
  FiDatabase,
  FiMail,
  FiShield,
  FiBell,
  FiSave,
  FiRefreshCw,
  FiGlobe,
  FiClock,
} from 'react-icons/fi';
import { Card, CardHeader, Button, Input, Select } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    appName: 'Vegetable CRM',
    appVersion: '1.0.0',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
    language: 'en',
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Vegetable CRM',
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: '60',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    twoFactorAuth: false,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    newUserNotification: true,
    salesAlerts: true,
    paymentReminders: true,
    lowStockAlerts: false,
    dailyReports: true,
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: FiSettings },
    { id: 'email', label: 'Email', icon: FiMail },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'database', label: 'Database', icon: FiDatabase },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage application settings and configurations</p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <FiRefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FiSave className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader title="General Settings" subtitle="Configure basic application settings" />
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Application Name"
              value={generalSettings.appName}
              onChange={(e) => setGeneralSettings({ ...generalSettings, appName: e.target.value })}
            />
            <Input
              label="Version"
              value={generalSettings.appVersion}
              disabled
            />
            <Select
              label="Timezone"
              value={generalSettings.timezone}
              onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
              ]}
            />
            <Select
              label="Date Format"
              value={generalSettings.dateFormat}
              onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
            <Select
              label="Currency"
              value={generalSettings.currency}
              onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
              options={[
                { value: 'INR', label: 'Indian Rupee (₹)' },
                { value: 'USD', label: 'US Dollar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
              ]}
            />
            <Select
              label="Language"
              value={generalSettings.language}
              onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'ta', label: 'Tamil' },
              ]}
            />
          </div>
        </Card>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <Card>
          <CardHeader title="Email Settings" subtitle="Configure SMTP settings for email notifications" />
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="SMTP Host"
              value={emailSettings.smtpHost}
              onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
              placeholder="smtp.example.com"
            />
            <Input
              label="SMTP Port"
              value={emailSettings.smtpPort}
              onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
              placeholder="587"
            />
            <Input
              label="SMTP Username"
              value={emailSettings.smtpUser}
              onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
              placeholder="user@example.com"
            />
            <Input
              label="SMTP Password"
              type="password"
              value={emailSettings.smtpPassword}
              onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
            />
            <Input
              label="From Email"
              value={emailSettings.fromEmail}
              onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
              placeholder="noreply@example.com"
            />
            <Input
              label="From Name"
              value={emailSettings.fromName}
              onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
            />
          </div>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader title="Security Settings" subtitle="Configure authentication and security policies" />
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Session Timeout (minutes)"
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
              />
              <Input
                label="Max Login Attempts"
                type="number"
                value={securitySettings.maxLoginAttempts}
                onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })}
              />
              <Input
                label="Min Password Length"
                type="number"
                value={securitySettings.passwordMinLength}
                onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: e.target.value })}
              />
            </div>
            <div className="border-t dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Password Requirements</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireUppercase}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require uppercase letters</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireNumbers}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require numbers</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.requireSpecialChars}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChars: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require special characters</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorAuth}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable Two-Factor Authentication</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader title="Notification Settings" subtitle="Configure system notifications and alerts" />
          <div className="p-6 space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enable email notifications for system events</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">New User Registration</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when new users register</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.newUserNotification}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, newUserNotification: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Sales Alerts</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts for large sales transactions</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.salesAlerts}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, salesAlerts: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Payment Reminders</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Send payment reminder notifications</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.paymentReminders}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, paymentReminders: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
            </label>
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Daily Reports</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily summary reports via email</p>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings.dailyReports}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, dailyReports: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
              />
            </label>
          </div>
        </Card>
      )}

      {/* Database Settings */}
      {activeTab === 'database' && (
        <Card>
          <CardHeader title="Database Settings" subtitle="Database information and maintenance" />
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FiDatabase className="w-5 h-5 text-primary-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Database Size</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">256 MB</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FiClock className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Backup</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">2 hours ago</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FiGlobe className="w-5 h-5 text-blue-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">Connected</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <FiRefreshCw className="w-4 h-4" />
                Create Backup
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <FiDatabase className="w-4 h-4" />
                Optimize Database
              </Button>
              <Button
                variant="danger"
                className="flex items-center gap-2"
                onClick={async () => {
                  if (!confirm('This will remove all synced seed/mock data from the MongoDB database. Are you sure?')) return;
                  try {
                    const res = await fetch('/api/cleanup', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ collections: ['vegetables', 'farmers', 'customers', 'salesbills', 'payments'] }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      toast.success(`Cleanup done: ${JSON.stringify(data.results)}`);
                    } else {
                      toast.error(data.error || 'Cleanup failed');
                    }
                  } catch {
                    toast.error('Cleanup request failed');
                  }
                }}
              >
                <FiRefreshCw className="w-4 h-4" />
                Clean Seed Data
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
