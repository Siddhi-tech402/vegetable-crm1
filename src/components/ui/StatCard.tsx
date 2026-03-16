import { ReactNode } from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: number;
  changeLabel?: string;
  colorClass?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  change,
  changeLabel,
  colorClass = 'bg-primary-500',
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change !== undefined && (
            <div className="mt-2 flex items-center">
              {isPositive ? (
                <FiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <FiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={`p-3 rounded-lg ${colorClass} text-white flex items-center justify-center`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
