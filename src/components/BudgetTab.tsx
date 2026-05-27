/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame,
  Plus,
  Trash2,
  Calendar,
  Zap,
  CheckCircle,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import { Budget, RecurringRule, Category, Transaction } from '../types';

interface BudgetTabProps {
  budgets: Budget[];
  recurringRules: RecurringRule[];
  categories: Category[];
  transactions: Transaction[];
  baseCurrency: string;
  onAddBudget: (data: any) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onAddRecurringRule: (data: any) => Promise<void>;
  onToggleRecurringRule: (id: string, active: boolean) => Promise<void>;
  onDeleteRecurringRule: (id: string) => Promise<void>;
}

export default function BudgetTab({
  budgets,
  recurringRules,
  categories,
  transactions,
  baseCurrency,
  onAddBudget,
  onDeleteBudget,
  onAddRecurringRule,
  onToggleRecurringRule,
  onDeleteRecurringRule,
}: BudgetTabProps) {
  // Budget Form inputs
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState(baseCurrency || 'USD');
  const [budgetCategory, setBudgetCategory] = useState(''); // Empty stands for "Overall"
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [budgetStart, setBudgetStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [budgetNotice, setBudgetNotice] = useState('');

  // Recurring Rule inputs
  const [recAmount, setRecAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState(baseCurrency || 'USD');
  const [recCategory, setRecCategory] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recPeriod, setRecPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [recNext, setRecNext] = useState(() => {
    // Default to first of next month
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [recNotice, setRecNotice] = useState('');

  // Currency formats
  const formatCurrency = (amount: number, cur: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur || 'USD',
    }).format(amount);
  };

  // Helper exchange rates matching backend map exactly to display consistent client conversion warning
  const EXCHANGE_RATES: Record<string, number> = {
    USD: 1,
    INR: 83.3,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 156.4,
  };

  const convertValue = (amount: number, from: string, to: string) => {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    const fromRate = EXCHANGE_RATES[f] || 1;
    const toRate = EXCHANGE_RATES[t] || 1;
    return (amount / fromRate) * toRate;
  };

  // Calculate current spend in specific category for the current month to show progress
  const getCategorySpendThisMonth = (catId?: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let spend = 0;
    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        // Find if matches category, or matches overall
        const isExpense = t.categoryType === 'EXPENSE';
        if (isExpense) {
          if (!catId || t.categoryId === catId) {
            spend += t.amountBase; // converted value in user's base currency standard
          }
        }
      }
    });
    return spend;
  };

  // Handle Budget Creation
  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetNotice('');

    if (!budgetAmount || isNaN(parseFloat(budgetAmount)) || parseFloat(budgetAmount) <= 0) {
      setBudgetNotice('Amount must be a positive number');
      return;
    }

    try {
      await onAddBudget({
        categoryId: budgetCategory || null,
        period: budgetPeriod,
        amount: parseFloat(budgetAmount),
        currency: budgetCurrency,
        startOn: budgetStart,
      });
      setBudgetNotice('Budget parameter registered successfully!');
      setBudgetAmount('');
      setTimeout(() => setBudgetNotice(''), 3000);
    } catch (err: any) {
      setBudgetNotice(err.message || 'Error occurred');
    }
  };

  // Handle Recurring Rule Creation
  const handleRecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecNotice('');

    if (!recAmount || isNaN(parseFloat(recAmount)) || parseFloat(recAmount) <= 0) {
      setRecNotice('Amount must be a positive number');
      return;
    }
    if (!recDesc.trim()) {
      setRecNotice('Please describe the subscription or cost');
      return;
    }

    try {
      await onAddRecurringRule({
        amount: parseFloat(recAmount),
        currency: recCurrency,
        categoryId: recCategory || null,
        description: recDesc,
        period: recPeriod,
        nextRun: recNext,
      });
      setRecNotice('Automated billing rule set successfully!');
      setRecAmount('');
      setRecDesc('');
      setTimeout(() => setRecNotice(''), 3000);
    } catch (err: any) {
      setRecNotice(err.message || 'Error creating rule');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* SECTION 1: Budgets Target Setter and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight flex items-center">
              <Flame className="w-5 h-5 mr-1 text-amber-500 animate-pulse" /> Set Budget Bounds
            </h3>
            <p className="text-xs font-mono text-slate-400">Specify active limits. Controls visual warnings on spend excess.</p>
          </div>

          <form onSubmit={handleBudgetSubmit} className="space-y-4 text-sm mt-4">
            {budgetNotice && (
              <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-blue-300 text-xs font-mono">
                {budgetNotice}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono font-medium">Budget Target Cap</label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-amber-500 outline-none placeholder:text-slate-600"
                placeholder="1000.00"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Currency</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:border-amber-500 outline-none"
                  value={budgetCurrency}
                  onChange={(e) => setBudgetCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Period</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-amber-500 outline-none disabled:opacity-50"
                  value={budgetPeriod}
                  onChange={(e) => setBudgetPeriod(e.target.value as any)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono">Scope of Budget</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
              >
                <option value="">Overall Monthly Limit (All Categories)</option>
                {categories
                  .filter((c) => c.type === 'EXPENSE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} Specific Outflow
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono">Target Activate Date</label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-amber-500 outline-none"
                value={budgetStart}
                onChange={(e) => setBudgetStart(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl font-mono tracking-tight cursor-pointer transition-all flex items-center justify-center"
            >
              <span>Map Budget Cap</span>
            </button>
          </form>
        </div>

        {/* Progress meters panel: 2/3 layout */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold font-sans text-white tracking-tight">Active Limits & Real-Time Burn</h3>
            <p className="text-xs font-mono text-slate-400">Current calendar month burn tracking vs designated limits.</p>
          </div>

          <div className="space-y-6 pt-2">
            {budgets.length > 0 ? (
              budgets.map((b) => {
                // Determine spend and limits converted correctly
                const isOverall = !b.categoryId;
                const spendBase = getCategorySpendThisMonth(b.categoryId);
                
                const budgetLimitBase = convertValue(b.amount, b.currency, baseCurrency);
                const percent = budgetLimitBase > 0 ? (spendBase / budgetLimitBase) * 100 : 0;
                
                let barColor = 'bg-emerald-500';
                let textColor = 'text-emerald-400';
                if (percent >= 100) {
                  barColor = 'bg-rose-500';
                  textColor = 'text-rose-400';
                } else if (percent >= 80) {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-400';
                }

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800/60 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white tracking-tight">
                          {isOverall ? 'Overall Spending Bound Allocation' : `${b.categoryName} Target cap`}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Period: <span className="uppercase text-slate-400">{b.period}</span>
                        </span>
                      </div>
                      <button
                        className="text-xs text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="Delete this budget boundary"
                        onClick={() => onDeleteBudget(b.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end text-xs font-mono">
                        <p className="text-slate-400">
                          Burn Rate:{' '}
                          <span className={`font-bold ${textColor}`}>
                            {formatCurrency(spendBase, baseCurrency)}
                          </span>{' '}
                          spent of {formatCurrency(budgetLimitBase, baseCurrency)}
                        </p>
                        <span className={`font-bold ${textColor}`}>{Math.round(percent)}%</span>
                      </div>

                      {/* Custom Progress bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        ></div>
                      </div>

                      {percent >= 100 && (
                        <div className="flex items-center space-x-1 text-[10px] text-rose-400 font-mono mt-1">
                          <AlertTriangle className="w-3.5 h-3.5 mr-0.5" />
                          <span>Overspend limits breached! Review cashflow.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                <p className="text-slate-500 font-mono text-sm leading-relaxed mb-4">No active budget allocations set.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Automated Actions & Subscription Billing */}
      <div className="border-t border-slate-800 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form left */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-sans text-white tracking-tight flex items-center">
                <Zap className="w-5 h-5 mr-1 text-blue-400 animate-pulse" /> Add Recurring Rule
              </h3>
              <p className="text-xs font-mono text-slate-400">Configure automated subscription / bill rules. Transactions generate on-trigger.</p>
            </div>

            <form onSubmit={handleRecSubmit} className="space-y-4 text-sm mt-4">
              {recNotice && (
                <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-blue-300 text-xs font-mono">
                  {recNotice}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Subscription Outflow Value</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-blue-500 outline-none placeholder:text-slate-600"
                  placeholder="20.00"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-xs font-mono">Currency</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:border-blue-500 outline-none"
                    value={recCurrency}
                    onChange={(e) => setRecCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 text-xs font-mono">Frequency</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-blue-500 outline-none"
                    value={recPeriod}
                    onChange={(e) => setRecPeriod(e.target.value as any)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Billing Descriptor Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none placeholder:text-slate-600"
                  placeholder="e.g. Netflix Premium, Gym Membership"
                  value={recDesc}
                  onChange={(e) => setRecDesc(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Mapped Category</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {categories
                    .filter((c) => c.type === 'EXPENSE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Next Automatic Run Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-blue-500 outline-none"
                  value={recNext}
                  onChange={(e) => setRecNext(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl font-mono tracking-tight cursor-pointer transition-all flex items-center justify-center"
              >
                <span>Automate Outflow</span>
              </button>
            </form>
          </div>

          {/* Active lists: 2/3 layout */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-lg font-bold font-sans text-white tracking-tight">Active Automation Rules</h3>
              <p className="text-xs font-mono text-slate-400 font-medium">Automatic billing jobs that process on calendar changes.</p>
            </div>

            <div className="space-y-3 pt-2">
              {recurringRules.length > 0 ? (
                recurringRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      rule.active
                        ? 'bg-slate-950 border-blue-900/40 hover:border-blue-700'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Active green/offline grey dot indicator */}
                      <div className={`p-2.5 rounded-xl ${rule.active ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Calendar className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{rule.description}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Value: {rule.amount.toFixed(2)} {rule.currency}{' '}
                          <span className="text-slate-600">|</span> Category: {rule.categoryName || 'Other'}{' '}
                          <span className="text-slate-600">|</span> Frequency: <span className="uppercase text-slate-300 font-bold">{rule.period}</span>
                        </p>
                        <p className="text-[10px] text-blue-400 font-mono flex items-center mt-1">
                          <Clock className="w-3.5 h-3.5 mr-0.5" /> Next trigger: {new Date(rule.nextRun).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Toggle button */}
                      <button
                        className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title={rule.active ? 'Pause Rule' : 'Activate Rule'}
                        onClick={() => onToggleRecurringRule(rule.id, !rule.active)}
                      >
                        {rule.active ? (
                          <ToggleRight className="w-8 h-8 text-blue-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-600" />
                        )}
                      </button>
                      
                      {/* Delete action */}
                      <button
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors"
                        title="Delete scheduling"
                        onClick={() => onDeleteRecurringRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                  <p className="text-slate-500 font-mono text-sm leading-relaxed">No automated subscription billing schedules yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
