/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Category, Transaction, Budget, RecurringRule } from '../src/types';

const DB_DIR = path.join(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  users: User[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringRules: RecurringRule[];
}

// Default categories to seed if empty
const DEFAULT_CATEGORIES: Omit<Category, 'userId'>[] = [
  { id: 'cat-salary', name: 'Salary', type: 'INCOME', icon: 'Briefcase' },
  { id: 'cat-freelance', name: 'Freelance', type: 'INCOME', icon: 'Coins' },
  { id: 'cat-food', name: 'Food & Dining', type: 'EXPENSE', icon: 'Utensils' },
  { id: 'cat-housing', name: 'Housing & Rent', type: 'EXPENSE', icon: 'Home' },
  { id: 'cat-transport', name: 'Transport & Cab', type: 'EXPENSE', icon: 'Car' },
  { id: 'cat-shopping', name: 'Shopping & Gear', type: 'EXPENSE', icon: 'ShoppingBag' },
  { id: 'cat-bills', name: 'Bills & Utilities', type: 'EXPENSE', icon: 'Zap' },
  { id: 'cat-[#education]', name: 'Education', type: 'EXPENSE', icon: 'GraduationCap' },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'EXPENSE', icon: 'Tv' },
];

class Database {
  private data: DatabaseSchema = {
    users: [],
    categories: [],
    transactions: [],
    budgets: [],
    recurringRules: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (!fs.existsSync(DB_FILE)) {
        this.save();
      } else {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      }

      // Seed categories if empty
      if (this.data.categories.length === 0) {
        DEFAULT_CATEGORIES.forEach((cat) => {
          this.data.categories.push({
            ...cat,
            userId: 'system',
          });
        });
        this.save();
      }
    } catch (err) {
      console.error('Error initializing data store, using in-memory backup:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save data store:', err);
    }
  }

  // Cryptographic Helpers
  public hashPassword(p: string): string {
    return crypto.createHash('sha256').update(p).digest('hex');
  }

  // Users
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(email: string, passwordHash: string, name?: string, currency: string = 'INR'): User {
    const user: User = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name,
      currency,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'currency'>>): User | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.currency !== undefined) user.currency = updates.currency;
    this.save();
    return user;
  }

  // Categories
  public getCategories(userId: string): Category[] {
    return this.data.categories.filter(c => c.userId === 'system' || c.userId === userId);
  }

  public getCategoryById(id: string, userId: string): Category | undefined {
    return this.data.categories.find(c => c.id === id && (c.userId === 'system' || c.userId === userId));
  }

  public createCategory(userId: string, name: string, type: 'INCOME' | 'EXPENSE', icon: string): Category {
    const cat: Category = {
      id: `cat-${crypto.randomUUID()}`,
      name,
      type,
      icon,
      userId,
    };
    this.data.categories.push(cat);
    this.save();
    return cat;
  }

  // Transactions
  public getTransactions(userId: string): Transaction[] {
    return this.data.transactions.filter(t => t.userId === userId);
  }

  public getTransactionById(id: string, userId: string): Transaction | undefined {
    return this.data.transactions.find(t => t.id === id && t.userId === userId);
  }

  public createTransaction(
    userId: string,
    amount: number,
    currency: string,
    amountBase: number,
    description: string,
    categoryId: string | undefined,
    date: string,
    source: 'manual' | 'csv' | 'ocr',
    recurringId?: string
  ): Transaction {
    const txn: Transaction = {
      id: crypto.randomUUID(),
      userId,
      amount,
      currency,
      amountBase,
      description,
      categoryId,
      date,
      source,
      recurringId,
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.push(txn);
    this.save();
    return txn;
  }

  public deleteTransaction(id: string, userId: string): boolean {
    const idx = this.data.transactions.findIndex(t => t.id === id && t.userId === userId);
    if (idx === -1) return false;
    this.data.transactions.splice(idx, 1);
    this.save();
    return true;
  }

  public updateTransaction(
    id: string,
    userId: string,
    updates: Partial<Pick<Transaction, 'amount' | 'currency' | 'amountBase' | 'description' | 'categoryId' | 'date'>>
  ): Transaction | undefined {
    const txn = this.getTransactionById(id, userId);
    if (!txn) return undefined;
    if (updates.amount !== undefined) txn.amount = updates.amount;
    if (updates.currency !== undefined) txn.currency = updates.currency;
    if (updates.amountBase !== undefined) txn.amountBase = updates.amountBase;
    if (updates.description !== undefined) txn.description = updates.description;
    if (updates.categoryId !== undefined) txn.categoryId = updates.categoryId;
    if (updates.date !== undefined) txn.date = updates.date;
    this.save();
    return txn;
  }

  // Budgets
  public getBudgets(userId: string): Budget[] {
    return this.data.budgets.filter(b => b.userId === userId);
  }

  public getBudgetById(id: string, userId: string): Budget | undefined {
    return this.data.budgets.find(b => b.id === id && b.userId === userId);
  }

  public createBudget(
    userId: string,
    categoryId: string | undefined,
    period: 'monthly' | 'weekly',
    amount: number,
    currency: string,
    startOn: string
  ): Budget {
    // Overwrite existing budget for same category/period to avoid duplicates
    const existingIdx = this.data.budgets.findIndex(
      b => b.userId === userId && b.categoryId === categoryId && b.period === period
    );

    const budget: Budget = {
      id: crypto.randomUUID(),
      userId,
      categoryId,
      period,
      amount,
      currency,
      startOn,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      this.data.budgets[existingIdx] = budget;
    } else {
      this.data.budgets.push(budget);
    }

    this.save();
    return budget;
  }

  public deleteBudget(id: string, userId: string): boolean {
    const idx = this.data.budgets.findIndex(b => b.id === id && b.userId === userId);
    if (idx === -1) return false;
    this.data.budgets.splice(idx, 1);
    this.save();
    return true;
  }

  // Recurring Rules
  public getRecurringRules(userId: string): RecurringRule[] {
    return this.data.recurringRules.filter(r => r.userId === userId);
  }

  public createRecurringRule(
    userId: string,
    amount: number,
    currency: string,
    categoryId: string | undefined,
    description: string,
    period: 'monthly' | 'weekly',
    nextRun: string
  ): RecurringRule {
    const rule: RecurringRule = {
      id: crypto.randomUUID(),
      userId,
      amount,
      currency,
      categoryId,
      description,
      period,
      nextRun,
      active: true,
    };
    this.data.recurringRules.push(rule);
    this.save();
    return rule;
  }

  public updateRecurringRule(
    id: string,
    userId: string,
    updates: Partial<Pick<RecurringRule, 'amount' | 'currency' | 'categoryId' | 'description' | 'period' | 'nextRun' | 'active'>>
  ): RecurringRule | undefined {
    const idx = this.data.recurringRules.findIndex(r => r.id === id && r.userId === userId);
    if (idx === -1) return undefined;
    const rule = this.data.recurringRules[idx];
    if (updates.amount !== undefined) rule.amount = updates.amount;
    if (updates.currency !== undefined) rule.currency = updates.currency;
    if (updates.categoryId !== undefined) rule.categoryId = updates.categoryId;
    if (updates.description !== undefined) rule.description = updates.description;
    if (updates.period !== undefined) rule.period = updates.period;
    if (updates.nextRun !== undefined) rule.nextRun = updates.nextRun;
    if (updates.active !== undefined) rule.active = updates.active;
    this.save();
    return rule;
  }

  public deleteRecurringRule(id: string, userId: string): boolean {
    const idx = this.data.recurringRules.findIndex(r => r.id === id && r.userId === userId);
    if (idx === -1) return false;
    this.data.recurringRules.splice(idx, 1);
    this.save();
    return true;
  }
}

export const db = new Database();
