/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { GoogleGenAI, Type } from '@google/genai';
import { Category, Transaction, Budget, RecurringRule } from './src/types';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-smart-tracker-secret-key-2026';

// Multi-currency exchange rate mapping (relative to USD)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.3,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.4,
  CAD: 1.37,
  AUD: 1.51,
};

function convertCurrency(amount: number, from: string, to: string): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const fromRate = EXCHANGE_RATES[f] || 1;
  const toRate = EXCHANGE_RATES[t] || 1;
  const amountUSD = amount / fromRate;
  return amountUSD * toRate;
}

// Lazy load Gemini AI to avoid startup crashes if key is omitted
let _ai: any = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
    return null;
  }
  if (!_ai) {
    _ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return _ai;
}

// Express JSON body limits for parsing large screenshots or receipts
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid' });
    }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  });
}

// Hook to auto-process recurring rules on dashboard access
function processRecurringRules(userId: string) {
  const rules = db.getRecurringRules(userId);
  const now = new Date();
  const user = db.getUserById(userId);
  if (!user) return;

  rules.forEach((rule) => {
    if (!rule.active) return;
    let nextRunDate = new Date(rule.nextRun);

    while (nextRunDate <= now) {
      // Currency conversion to user's base currency
      const amountBase = convertCurrency(rule.amount, rule.currency, user.currency);

      // Create expense transaction (recurring rules typically are bills/expenses, stored as negative values internally or standard positive with Category flag)
      db.createTransaction(
        userId,
        rule.amount,
        rule.currency,
        amountBase,
        `${rule.description} (Recurring)`,
        rule.categoryId,
        rule.nextRun,
        'manual',
        rule.id
      );

      // Advance nextRun
      if (rule.period === 'monthly') {
        nextRunDate.setMonth(nextRunDate.getMonth() + 1);
      } else {
        nextRunDate.setDate(nextRunDate.getDate() + 7);
      }

      const nextRunStr = nextRunDate.toISOString().split('T')[0];
      db.updateRecurringRule(rule.id, userId, { nextRun: nextRunStr });
    }
  });
}

// --- API ENDPOINTS ---

// 1. Auth Endpoint: Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, name, currency } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = db.hashPassword(password);
    const user = db.createUser(email, passwordHash, name, currency || 'USD');

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, currency: user.currency },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Auth Endpoint: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.getUserByEmail(email);
    if (!user || user.passwordHash !== db.hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, currency: user.currency },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Auth Endpoint: Get Profile
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json({ id: user.id, email: user.email, name: user.name, currency: user.currency });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile setting (e.g. currency conversion preference)
app.put('/api/auth/settings', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, currency } = req.body;
    
    const user = db.updateUser(userId, { name, currency });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // After updating base currency, re-compute existing transactions base values
    const txns = db.getTransactions(userId);
    txns.forEach((t) => {
      const amountBase = convertCurrency(t.amount, t.currency, user.currency);
      db.updateTransaction(t.id, userId, { amountBase });
    });

    res.json({ id: user.id, email: user.email, name: user.name, currency: user.currency });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Categories Endpoints
app.get('/api/categories', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cats = db.getCategories(userId);
    res.json(cats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, type, icon } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type (INCOME/EXPENSE) are required' });
    }

    const cat = db.createCategory(userId, name, type, icon || 'Tag');
    res.status(201).json(cat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Transactions Endpoints
app.get('/api/transactions', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const txns = db.getTransactions(userId);
    const cats = db.getCategories(userId);

    // Populate category info
    const resolvedTxns = txns.map((t) => {
      const cat = cats.find((c) => c.id === t.categoryId);
      return {
        ...t,
        categoryName: cat ? cat.name : 'Uncategorized',
        categoryIcon: cat ? cat.icon : 'Tag',
        categoryType: cat ? cat.type : 'EXPENSE',
      };
    });

    // Sort descending by date
    resolvedTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(resolvedTxns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency, description, categoryId, date, source } = req.body;

    if (!amount || !currency || !date) {
      return res.status(400).json({ error: 'Amount, currency, and date are required' });
    }

    const user = db.getUserById(userId)!;
    const amountBase = convertCurrency(Number(amount), currency, user.currency);

    const txn = db.createTransaction(
      userId,
      Number(amount),
      currency,
      amountBase,
      description || 'Transaction',
      categoryId,
      date,
      source || 'manual'
    );

    res.status(201).json(txn);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/transactions/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { amount, currency, description, categoryId, date } = req.body;

    const user = db.getUserById(userId)!;
    const amountBase = amount !== undefined ? convertCurrency(Number(amount), currency || user.currency, user.currency) : undefined;

    const txn = db.updateTransaction(id, userId, {
      amount: amount !== undefined ? Number(amount) : undefined,
      currency,
      amountBase,
      description,
      categoryId,
      date,
    });

    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(txn);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const deleted = db.deleteTransaction(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Budget Endpoints
app.get('/api/budgets', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budgets = db.getBudgets(userId);
    const cats = db.getCategories(userId);

    const resolved = budgets.map((b) => {
      const cat = cats.find((c) => c.id === b.categoryId);
      return {
        ...b,
        categoryName: cat ? cat.name : 'Overall Budget',
      };
    });

    res.json(resolved);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/budgets', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { categoryId, period, amount, currency, startOn } = req.body;

    if (!amount || !currency || !period || !startOn) {
      return res.status(400).json({ error: 'Amount, currency, period, and start date are required' });
    }

    const budget = db.createBudget(
      userId,
      categoryId || undefined,
      period,
      Number(amount),
      currency,
      startOn
    );

    res.status(201).json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/budgets/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const deleted = db.deleteBudget(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Recurring Rules Endpoints
app.get('/api/recurring', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rules = db.getRecurringRules(userId);
    const cats = db.getCategories(userId);

    const resolved = rules.map((r) => {
      const cat = cats.find((c) => c.id === r.categoryId);
      return {
        ...r,
        categoryName: cat ? cat.name : 'Other',
      };
    });

    res.json(resolved);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recurring', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency, categoryId, description, period, nextRun } = req.body;

    if (!amount || !currency || !period || !nextRun || !description) {
      return res.status(400).json({ error: 'Amount, currency, description, period, and next run date are required' });
    }

    const rule = db.createRecurringRule(
      userId,
      Number(amount),
      currency,
      categoryId || undefined,
      description,
      period,
      nextRun
    );

    res.status(201).json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/recurring/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { active, amount, currency, categoryId, description, period, nextRun } = req.body;

    const updated = db.updateRecurringRule(id, userId, {
      active,
      amount: amount !== undefined ? Number(amount) : undefined,
      currency,
      categoryId,
      description,
      period,
      nextRun,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Recurring rule not found' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/recurring/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const deleted = db.deleteRecurringRule(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Recurring rule not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Reports Summary / Dashboard analytics
app.get('/api/reports/summary', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = db.getUserById(userId)!;

    // Process recurring transactions first before pulling summaries to make sure recurring costs are in charts!
    processRecurringRules(userId);

    const txns = db.getTransactions(userId);
    const cats = db.getCategories(userId);
    const budgets = db.getBudgets(userId);

    // Target the current month (May 2026 per the metadata, or standard dynamic calendar)
    // To make sure student demo looks complete, let's use all data that falls in the current calendar month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Filter current month transactions
    const currentMonthTxns = txns.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });

    let monthIncome = 0;
    let monthSpend = 0;

    // Calculate income vs expense totals (using base currency conversion values)
    currentMonthTxns.forEach((t) => {
      const cat = cats.find((c) => c.id === t.categoryId);
      const isIncome = cat ? cat.type === 'INCOME' : false;

      if (isIncome) {
        monthIncome += t.amountBase;
      } else {
        monthSpend += t.amountBase;
      }
    });

    const net = monthIncome - monthSpend;

    // Budget Limit Cap
    // Find overall budget or default to a reasonable budget if not specified
    const overallBudget = budgets.find((b) => !b.categoryId);
    const budgetCap = overallBudget ? convertCurrency(overallBudget.amount, overallBudget.currency, user.currency) : 1000; // default cap
    const budgetUsage = budgetCap > 0 ? (monthSpend / budgetCap) * 100 : 0;

    // Category breakdown logic
    const categoryTotals: Record<string, { amount: number; color?: string }> = {};
    const catColors: Record<string, string> = {
      'Food & Dining': '#f59e0b', // Amber
      'Housing & Rent': '#ef4444', // Red
      'Transport & Cab': '#3b82f6', // Blue
      'Shopping & Gear': '#ec4899', // Pink
      'Bills & Utilities': '#10b981', // Emerald
      'Education': '#8b5cf6', // Violet
      'Entertainment': '#ff007f', // Rose
      'Salary': '#22c55e',
      'Freelance': '#06b6d4',
    };

    currentMonthTxns.forEach((t) => {
      const cat = cats.find((c) => c.id === t.categoryId);
      if (cat && cat.type === 'EXPENSE') {
        const catName = cat.name;
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { amount: 0, color: catColors[catName] || '#6b7280' };
        }
        categoryTotals[catName].amount += t.amountBase;
      }
    });

    const totalExpenseSum = Object.values(categoryTotals).reduce((sum, item) => sum + item.amount, 0);

    const categoryBreakdown = Object.keys(categoryTotals).map((name) => {
      const t = categoryTotals[name];
      return {
        categoryName: name,
        amount: Math.round(t.amount * 100) / 100,
        percentage: totalExpenseSum > 0 ? Math.round((t.amount / totalExpenseSum) * 100) : 0,
        color: t.color,
      };
    });

    // Populate recent 10 transactions with category detail
    const recentResolved = txns.slice(0, 10).map((t) => {
      const cat = cats.find((c) => c.id === t.categoryId);
      return {
        ...t,
        categoryName: cat ? cat.name : 'Uncategorized',
        categoryIcon: cat ? cat.icon : 'Tag',
        categoryType: cat ? cat.type : 'EXPENSE',
      };
    });

    // Generate monthly trend for visual charting (last 6 months)
    const monthlyTrend: { month: string; income: number; expense: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const checkDate = new Date();
      checkDate.setMonth(now.getMonth() - i);
      const year = checkDate.getFullYear();
      const mIdx = checkDate.getMonth();

      // Sum values
      let iSum = 0;
      let eSum = 0;

      txns.forEach((t) => {
        const tDate = new Date(t.date);
        if (tDate.getFullYear() === year && tDate.getMonth() === mIdx) {
          const cat = cats.find((c) => c.id === t.categoryId);
          const isIncome = cat ? cat.type === 'INCOME' : false;
          if (isIncome) {
            iSum += t.amountBase;
          } else {
            eSum += t.amountBase;
          }
        }
      });

      monthlyTrend.push({
        month: `${monthNames[mIdx]}`,
        income: Math.round(iSum * 100) / 100,
        expense: Math.round(eSum * 100) / 100,
      });
    }

    res.json({
      monthIncome: Math.round(monthIncome * 100) / 100,
      monthSpend: Math.round(monthSpend * 100) / 100,
      net: Math.round(net * 100) / 100,
      currency: user.currency,
      budgetCap: Math.round(budgetCap * 100) / 100,
      budgetUsage: Math.round(budgetUsage * 10) / 10,
      categoryBreakdown,
      recentTransactions: recentResolved,
      monthlyTrend,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. CSV Bulk Parser Ingest / mapping
app.post('/api/import/csv', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = db.getUserById(userId)!;
    const { csvText } = req.body;

    if (!csvText || csvText.trim() === '') {
      return res.status(400).json({ error: 'CSV data is empty' });
    }

    const lines = csvText.trim().split('\n');
    let importedCount = 0;

    // Default system categories to automatically map to
    const cats = db.getCategories(userId);
    const expenseCats = cats.filter((c) => c.type === 'EXPENSE');
    const incomeCats = cats.filter((c) => c.type === 'INCOME');

    lines.forEach((line: string, index: number) => {
      // Skip header row if matches common terms
      if (index === 0 && (line.toLowerCase().includes('date') || line.toLowerCase().includes('amount') || line.toLowerCase().includes('desc'))) {
        return;
      }

      // Simple robust CSV split supporting quotes
      const cells = line.split(/[;,]/).map((c) => c.replace(/^["']|["']$/g, '').trim());
      if (cells.length < 2) return;

      // Expect format: Date, Description, Amount, Currency (optional), Category (optional)
      // e.g. "2026-05-20", "Uber Ride", "350", "INR", "Transport"
      // or "2026-05-22", "Salary Payment", "5000", "USD", "Salary"
      const dateCell = cells[0];
      const descCell = cells[1];
      const amountCell = parseFloat(cells[2]);
      const currencyCell = (cells[3] || user.currency).toUpperCase();
      const categoryCell = cells[4];

      if (!dateCell || isNaN(amountCell)) return;

      // Auto assign category matching or generic keyword rule
      let assignedCategoryId: string | undefined = undefined;

      if (categoryCell) {
        const matchedCat = cats.find((c) => c.name.toLowerCase() === categoryCell.toLowerCase());
        if (matchedCat) {
          assignedCategoryId = matchedCat.id;
        }
      }

      if (!assignedCategoryId) {
        // Keyword heuristic trigger
        const text = descCell.toLowerCase();
        if (text.includes('uber') || text.includes('ola') || text.includes('taxi') || text.includes('cab') || text.includes('metro')) {
          assignedCategoryId = cats.find((c) => c.name.toLowerCase().includes('transport'))?.id;
        } else if (text.includes('zomato') || text.includes('swiggy') || text.includes('food') || text.includes('restaurant') || text.includes('stew') || text.includes('cafe')) {
          assignedCategoryId = cats.find((c) => c.name.toLowerCase().includes('food'))?.id;
        } else if (text.includes('amazon') || text.includes('flipkart') || text.includes('shopping') || text.includes('mall') || text.includes('cloth')) {
          assignedCategoryId = cats.find((c) => c.name.toLowerCase().includes('shopping'))?.id;
        } else if (text.includes('rent') || text.includes('lease') || text.includes('housing') || text.includes('apartment')) {
          assignedCategoryId = cats.find((c) => c.name.toLowerCase().includes('housing'))?.id;
        } else if (text.includes('salary') || text.includes('paycheck') || text.includes('employer')) {
          assignedCategoryId = cats.find((c) => c.name.toLowerCase().includes('salary'))?.id;
        } else {
          // Default based on amount positivity
          const defaultCat = amountCell < 0 ? expenseCats[0] : incomeCats[0];
          assignedCategoryId = defaultCat?.id;
        }
      }

      const cleanAmount = Math.abs(amountCell);
      const isNegative = amountCell < 0;
      
      const amountBase = convertCurrency(cleanAmount, currencyCell, user.currency);

      db.createTransaction(
        userId,
        cleanAmount,
        currencyCell,
        amountBase,
        descCell,
        assignedCategoryId,
        dateCell,
        'csv'
      );
      importedCount++;
    });

    res.json({ success: true, count: importedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Gemini receipt OCR parsing Endpoint
app.post('/api/ocr/parse', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { imageBase64, sampleText } = req.body;
    
    // In case no real image is provided, or the user enters standard pasted text,
    // we use the text directly. If an image was submitted, we run real Gemini OCR!
    const ai = getGeminiClient();
    if (!ai) {
      // Fallback parser if Gemini API Key is missing or not configured
      const parsingText = sampleText || "Cafe Latte 180 INR\nGST Tax 9 INR\nTotal Amount 189 INR\nDate: 2026-05-24";
      const lines = parsingText.split('\n');
      
      // Basic match
      let totalAmount = 189;
      let date = new Date().toISOString().split('T')[0];
      let description = "Cafe Latte Café";
      let currency = "INR";

      lines.forEach((l: string) => {
        const low = l.toLowerCase();
        if (low.includes('total') || low.includes('sum') || low.includes('pay')) {
          const m = l.match(/\d+(\.\d+)?/);
          if (m) totalAmount = parseFloat(m[0]);
        }
        if (low.includes('date')) {
          const m = l.match(/\d{4}-\d{2}-\d{2}/);
          if (m) date = m[0];
        }
        if (low.includes('usd')) currency = 'USD';
        if (low.includes('eur')) currency = 'EUR';
        if (low.includes('inr')) currency = 'INR';
      });

      return res.json({
        success: true,
        merchantName: 'Local Corner Café (Simulated OCR)',
        total: totalAmount,
        currency: currency,
        date: date,
        items: [
          { description: 'Cafe Latte', price: totalAmount - 9 },
          { description: 'Service GST Tax', price: 9 }
        ],
        rawText: parsingText,
        ocrNotice: 'Vite backend parsed this text locally. Connect your Gemini API Key in Settings > Secrets to unleash full visual computer OCR!'
      });
    }

    // Execute real generative multi-part content analysis with gemini-3.5-flash!
    let prompt = `Analyze this checkout receipt. Extract:
1. Vendor/Merchant name.
2. Date of transaction in format YYYY-MM-DD.
3. Total amount paid.
4. Currency code (3 letters, e.g. USD, INR, EUR, etc).
5. Line items with names and prices.

Return a JSON document with this exact format:
{
  "merchantName": "Name",
  "date": "YYYY-MM-DD",
  "total": 12.34,
  "currency": "USD",
  "items": [
    { "description": "Item A", "price": 10.00 }
  ]
}`;

    let response;
    if (imageBase64) {
      // Strip prefix if any (e.g. data:image/png;base64,)
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png'
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });
    } else {
      // Text based document extraction
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Given receipt text: "${sampleText || ''}"\n\n${prompt}`,
        config: {
          responseMimeType: 'application/json'
        }
      });
    }

    const result = JSON.parse(response.text || '{}');
    res.json({
      ...result,
      success: true,
      rawText: sampleText || "Image scanned via vision lens",
      ocrNotice: 'Active Gemini 3.5 OCR complete.'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Smart AI Personal Finance Advisor with full semantic context
app.post('/api/gemini/advisor', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { userPrompt } = req.body;
    
    const user = db.getUserById(userId)!;
    const txns = db.getTransactions(userId);
    const budgets = db.getBudgets(userId);
    const cats = db.getCategories(userId);

    // Filter recent transactions inside context to keep tokens small
    const resolvedTxns = txns.slice(0, 15).map((t) => {
      const cat = cats.find((c) => c.id === t.categoryId);
      return {
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        amountInBaseCurrency: t.amountBase,
        baseCurrency: user.currency,
        category: cat ? cat.name : 'Unknown',
        type: cat ? cat.type : 'EXPENSE',
        date: t.date,
      };
    });

    const activeBudgets = budgets.map((b) => {
      const cat = cats.find((c) => c.id === b.categoryId);
      return {
        category: cat ? cat.name : 'Overall Budget Limit',
        amount: b.amount,
        currency: b.currency,
        period: b.period,
      };
    });

    // Sum recent spending
    const spendSum = resolvedTxns
      .filter((t: any) => t.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amountInBaseCurrency, 0);

    const incomeSum = resolvedTxns
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum, item) => sum + item.amountInBaseCurrency, 0);

    const systemContext = `You are a certified CFP (Certified Financial Planner) and smart personal wealth advisor integrated into a "Smart Expense Tracker".
The current user is ${user.name || 'Financial Enthusiast'}. Their base currency choice is "${user.currency}".

Here is their current active financial dashboard context:
- Recent Transaction History: ${JSON.stringify(resolvedTxns)}
- Set Monthly Budgets: ${JSON.stringify(activeBudgets)}
- Recent sum of spending inside listed history: ${spendSum} ${user.currency}
- Recent sum of income inside listed history: ${incomeSum} ${user.currency}

Analyze this context and offer concrete, empathetic, professional wealth tips. Point out if they are overspending on categories or have healthy cashflow. Speak directly, keep paragraphs highly readable, and recommend practical savings actions.`;

    const ai = getGeminiClient();
    if (!ai) {
      // Dynamic simulated advice if key is offline or missing
      return res.json({
        advice: `### Hello ${user.name || 'Friend'}! 🌟

Here is a financial health brief from your **Smart Finance Evaluator**:
- **Recent Cash Flow**: Your current income-to-spend ratio is looking stable. Your analyzed expenses total **${spendSum} ${user.currency}** against an income of **${incomeSum} ${user.currency}**.
- **Visual Trends**: To keep net savings positive, we suggest aiming to save at least **20%** of your income (the 50/30/20 rule).
- **Practical Recommendation**:
  1. Set a specific budget cap for categories like **Food & Dining** and **Entertainment** to curb incremental leakages.
  2. Map out structural recurring utility costs using the **Recurring module** to avoid late fee penalties!

*Tip: Connect your Google Gemini API Key in settings to get interactive, AI-grounded multi-currency advisor responses tailored to your spending patterns in real time!*`,
        simulated: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt || 'Give me a summary of my current financial health and custom spending tips.',
      config: {
        systemInstruction: systemContext,
      },
    });

    res.json({
      advice: response.text || 'Unable to generate financial recommendations at this time. Please try again.',
      simulated: false,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Serve files / Dev and production config
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
