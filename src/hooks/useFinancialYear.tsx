'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface LockedYearEntry {
  year: string;
  lockedAt: string;
  lockedBy?: string;
}

interface FinancialYearContextType {
  financialYear: string;
  setFinancialYear: (year: string) => void;
  financialYears: string[];
  isYearLocked: (year: string) => boolean;
  lockYear: (year: string, password: string) => boolean;
  unlockYear: (year: string, password: string) => boolean;
  getYearDates: (year: string) => { startDate: Date; endDate: Date };
  currentFinancialYear: string;
}

const FinancialYearContext = createContext<FinancialYearContextType | undefined>(undefined);

const LOCK_PASSWORD_KEY = 'fy_lock_password';
const LOCKED_YEARS_KEY = 'fy_locked_years';
const DEFAULT_LOCK_PASSWORD = '1234';

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, so March = 2

  // Financial year starts from April
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

function generateFinancialYears(): string[] {
  const years: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  // Generate last 5 financial years
  for (let i = 0; i < 5; i++) {
    const year = startYear - i;
    years.push(`${year}-${(year + 1).toString().slice(-2)}`);
  }

  return years;
}

function getYearDatesFromFY(fy: string): { startDate: Date; endDate: Date } {
  // fy is like "2024-25"
  const parts = fy.split('-');
  const startYear = parseInt(parts[0], 10);
  return {
    startDate: new Date(startYear, 3, 1), // April 1
    endDate: new Date(startYear + 1, 2, 31, 23, 59, 59), // March 31
  };
}

export function FinancialYearProvider({ children }: { children: ReactNode }) {
  const [financialYear, setFinancialYearState] = useState<string>('');
  const [financialYears] = useState<string[]>(generateFinancialYears());
  const [lockedYears, setLockedYears] = useState<LockedYearEntry[]>([]);
  const currentFY = getCurrentFinancialYear();

  // Load locked years and saved selection
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCKED_YEARS_KEY);
      if (saved) {
        setLockedYears(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    const savedFY = localStorage.getItem('financialYear');
    if (savedFY && financialYears.includes(savedFY)) {
      setFinancialYearState(savedFY);
    } else {
      setFinancialYearState(currentFY);
      localStorage.setItem('financialYear', currentFY);
    }
  }, [financialYears, currentFY]);

  const setFinancialYear = useCallback(
    (year: string) => {
      setFinancialYearState(year);
      localStorage.setItem('financialYear', year);
    },
    []
  );

  const isYearLocked = useCallback(
    (year: string): boolean => {
      // Current FY is never auto-locked
      if (year === currentFY) {
        return lockedYears.some((ly) => ly.year === year);
      }
      // Past FYs are locked by default unless explicitly unlocked
      return true;
    },
    [currentFY, lockedYears]
  );

  const getLockPassword = (): string => {
    try {
      return localStorage.getItem(LOCK_PASSWORD_KEY) || DEFAULT_LOCK_PASSWORD;
    } catch {
      return DEFAULT_LOCK_PASSWORD;
    }
  };

  const lockYear = useCallback(
    (year: string, password: string): boolean => {
      if (password !== getLockPassword()) return false;

      const updated = [...lockedYears.filter((ly) => ly.year !== year), { year, lockedAt: new Date().toISOString() }];
      setLockedYears(updated);
      localStorage.setItem(LOCKED_YEARS_KEY, JSON.stringify(updated));
      return true;
    },
    [lockedYears]
  );

  const unlockYear = useCallback(
    (year: string, password: string): boolean => {
      if (password !== getLockPassword()) return false;

      const updated = lockedYears.filter((ly) => ly.year !== year);
      setLockedYears(updated);
      localStorage.setItem(LOCKED_YEARS_KEY, JSON.stringify(updated));
      return true;
    },
    [lockedYears]
  );

  const getYearDates = useCallback((year: string) => {
    return getYearDatesFromFY(year);
  }, []);

  return (
    <FinancialYearContext.Provider
      value={{
        financialYear,
        setFinancialYear,
        financialYears,
        isYearLocked,
        lockYear,
        unlockYear,
        getYearDates,
        currentFinancialYear: currentFY,
      }}
    >
      {children}
    </FinancialYearContext.Provider>
  );
}

export function useFinancialYear() {
  const context = useContext(FinancialYearContext);
  if (context === undefined) {
    throw new Error('useFinancialYear must be used within a FinancialYearProvider');
  }
  return context;
}
