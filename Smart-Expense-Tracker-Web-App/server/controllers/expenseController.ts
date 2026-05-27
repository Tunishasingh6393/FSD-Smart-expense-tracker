/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import crypto from 'crypto';
import { dbInstance } from '../config/db';
import { TransactionSchema, BudgetSchema, RecurringRuleSchema, CategorySchema } from '../models/Schemas';

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.3,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.4,
  CAD: 1.37,
  AUD: 1.51,
};

function convertCurrency(val: number, from: string, to: string): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const fromRate = EXCHANGE_RATES[f] || 1;
  const toRate = EXCHANGE_RATES[t] || 1;
  return (val / fromRate) * toRate;
}

export const getDashboardSummaryData = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const db = dbInstance.getRawData();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'User missing' });
    }

    const baseCurrency = user.currency || 'INR';

    // Find user transactions
    const rawTxList = db.transactions.filter(t => t.userId === userId);
    const budgetList = db.budgets.filter(b => b.userId === userId);

    // Current month markers
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let monthIncome = 0;
    let monthSpend = 0;

    const filteredThisMonth = rawTxList.filter(t => {
      const matchDate = new Date(t.date);
      return matchDate.getFullYear() === curYear && matchDate.getMonth() === curMonth;
    });

    filteredThisMonth.forEach(tx => {
      const cat = db.categories.find(c => c.id === tx.categoryId);
      const isIncome = cat ? cat.type === 'INCOME' : false;
      const convertedVal = convertCurrency(tx.amount, tx.currency, baseCurrency);

      if (isIncome) {
        monthIncome += convertedVal;
      } else {
        monthSpend += convertedVal;
      }
    });

    const net = monthIncome - monthSpend;

    // Check active budget allocations
    const overallBudget = budgetList.find(b => b.categoryId === null);
    const budgetCap = overallBudget 
      ? convertCurrency(overallBudget.amount, overallBudget.currency, baseCurrency) 
      : 15000; // default benchmark cap fallback
    const budgetUsage = budgetCap > 0 ? (monthSpend / budgetCap) * 100 : 0;

    // Category portions
    const catSumMap: Record<string, number> = {};
    const catNameMap: Record<string, string> = {};

    filteredThisMonth.forEach(tx => {
      const cat = db.categories.find(c => c.id === tx.categoryId);
      const isExpense = cat ? cat.type === 'EXPENSE' : true;
      if (isExpense) {
        const catId = tx.categoryId;
        const catName = cat ? cat.name : 'Other utilities';
        const inBase = convertCurrency(tx.amount, tx.currency, baseCurrency);

        catSumMap[catId] = (catSumMap[catId] || 0) + inBase;
        catNameMap[catId] = catName;
      }
    });

    const breakdownList = Object.keys(catSumMap).map(key => {
      const totalAmountOfCat = catSumMap[key];
      const percent = monthSpend > 0 ? (totalAmountOfCat / monthSpend) * 100 : 0;
      return {
        categoryId: key,
        categoryName: catNameMap[key],
        amount: Math.round(totalAmountOfCat),
        percentage: Math.round(percent),
      };
    });

    // Recent 5 list
    const recent5 = rawTxList
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(t => {
        const cat = db.categories.find(c => c.id === t.categoryId);
        return {
          ...t,
          categoryName: cat ? cat.name : 'Expenses',
          categoryType: cat ? cat.type : 'EXPENSE',
        };
      });

    // Monthly trends dynamic stub
    const trendList: any[] = [];
    const monthLabels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    monthLabels.forEach((ml, idx) => {
      trendList.push({
        month: ml,
        income: Math.round(monthIncome * (0.8 + idx * 0.05)),
        expense: Math.round(monthSpend * (0.6 + (idx % 2) * 0.1)),
      });
    });

    res.json({
      monthIncome: Math.round(monthIncome),
      monthSpend: Math.round(monthSpend),
      net: Math.round(net),
      budgetCap: Math.round(budgetCap),
      budgetUsage: Math.round(budgetUsage),
      categoryBreakdown: breakdownList,
      recentTransactions: recent5,
      monthlyTrend: trendList,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error compiling summary' });
  }
};

export const addManualTx = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { amount, currency, description, categoryId, date, source } = req.body;

    const db = dbInstance.getRawData();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(401).json({ error: 'User offline' });

    const matchedCat = db.categories.find(c => c.id === categoryId);
    const amountInBase = convertCurrency(amount, currency, user.currency);

    const newTx: TransactionSchema = {
      id: `tx-${crypto.randomUUID()}`,
      userId,
      amount,
      currency,
      amountBase: amountInBase,
      description,
      categoryId,
      date: date || new Date().toISOString().split('T')[0],
      source: source || 'manual',
    };

    db.transactions.push(newTx);
    dbInstance.writeToDisk();

    res.status(201).json({
      success: true,
      transaction: {
        ...newTx,
        categoryName: matchedCat ? matchedCat.name : 'Outflow',
        categoryType: matchedCat ? matchedCat.type : 'EXPENSE',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTransactionsList = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const db = dbInstance.getRawData();

    const txs = db.transactions
      .filter(t => t.userId === userId)
      .map(t => {
        const cat = db.categories.find(c => c.id === t.categoryId);
        return {
          ...t,
          categoryName: cat ? cat.name : 'Ledger Port',
          categoryType: cat ? cat.type : 'EXPENSE',
        };
      });

    res.json(txs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
