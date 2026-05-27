/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export interface LocalDatabaseSchema {
  users: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  recurringRules: any[];
}

const DEFAULT_CATEGORIES = [
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

export class LocalDatabaseEngine {
  private static instance: LocalDatabaseEngine;
  private schema: LocalDatabaseSchema = {
    users: [],
    categories: [],
    transactions: [],
    budgets: [],
    recurringRules: [],
  };

  private constructor() {
    this.bootDb();
  }

  public static getInstance(): LocalDatabaseEngine {
    if (!LocalDatabaseEngine.instance) {
      LocalDatabaseEngine.instance = new LocalDatabaseEngine();
    }
    return LocalDatabaseEngine.instance;
  }

  private bootDb() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (!fs.existsSync(DB_FILE)) {
        this.writeToDisk();
      } else {
        const rawData = fs.readFileSync(DB_FILE, 'utf-8');
        this.schema = JSON.parse(rawData);
      }

      // Seed categories standard set if empty
      if (this.schema.categories.length === 0) {
        DEFAULT_CATEGORIES.forEach((cat) => {
          this.schema.categories.push({
            ...cat,
            userId: 'system',
          });
        });
        this.writeToDisk();
      }
    } catch (err) {
      console.error('JSON Database engine boot failure, using mock cache:', err);
    }
  }

  public getRawData(): LocalDatabaseSchema {
    return this.schema;
  }

  public writeToDisk() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed flushing memory queue to database store on disk:', err);
    }
  }
}

export const dbInstance = LocalDatabaseEngine.getInstance();
