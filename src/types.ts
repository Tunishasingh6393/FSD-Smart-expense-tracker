/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  email: string;
  name?: string;
  currency: string; // e.g. "USD", "INR", "EUR"
  passwordHash?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string; // string key for lucide icons
  userId: string; // Can be "system" for default categories or a specific userID
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number; // positive number
  currency: string;
  amountBase: number; // converted to user's base currency
  description: string;
  categoryId?: string; // mapped category
  categoryName?: string; // convenience resolved name
  categoryIcon?: string; // convenience resolved icon
  categoryType?: CategoryType; // whether is INCOME or EXPENSE flow
  date: string; // ISO format: YYYY-MM-DD
  source: 'manual' | 'csv' | 'ocr';
  recurringId?: string; // if created by recurring rule
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string; // Nullable for overall budget, or specific category
  categoryName?: string; // resolved category name (convenience)
  period: 'monthly' | 'weekly';
  amount: number;
  currency: string;
  startOn: string; // ISO date YYYY-MM-DD
  createdAt: string;
}

export interface RecurringRule {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  categoryId?: string;
  categoryName?: string; // resolved category name
  description: string;
  period: 'monthly' | 'weekly';
  nextRun: string; // ISO date YYYY-MM-DD
  active: boolean;
}

export interface DashboardSummary {
  monthIncome: number;
  monthSpend: number;
  net: number;
  currency: string;
  budgetCap: number;
  budgetUsage: number; // calculated as sum of expenses / budget limit
  categoryBreakdown: { categoryName: string; amount: number; percentage: number; color?: string }[];
  recentTransactions: Transaction[];
  monthlyTrend: { month: string; income: number; expense: number }[];
}
