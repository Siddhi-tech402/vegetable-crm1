'use client';

import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiSearch } from 'react-icons/fi';
import Input from './Input';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  onRowClick,
  emptyMessage = 'No data found',
  isLoading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter data based on search
  const filteredData = data.filter((row) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return columns.some((col) => {
      const value = getNestedValue(row, col.key as string);
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    const aValue = getNestedValue(a, sortField);
    const bValue = getNestedValue(b, sortField);

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  return (
    <div className="w-full">
      {/* Search */}
      {searchable && (
        <div className="mb-4">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<FiSearch />}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key as string}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                  } ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key as string)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.header}</span>
                    {col.sortable && sortField === col.key && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-6 w-6 text-primary-500 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={`${
                    onRowClick
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                      : ''
                  } transition-colors`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key as string}
                      className={`px-4 py-3 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap ${
                        col.className || ''
                      }`}
                    >
                      {col.render
                        ? col.render(getNestedValue(row, col.key as string), row)
                        : getNestedValue(row, col.key as string)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              aria-label="Previous page"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              aria-label="Next page"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
