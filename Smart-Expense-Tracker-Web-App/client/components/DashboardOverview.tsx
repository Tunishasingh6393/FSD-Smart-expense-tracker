/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Flame,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { DashboardSummary, Transaction } from '../src/types';

interface DashboardOverviewProps {
  summary: DashboardSummary;
  onNavigateToTab: (tab: string) => void;
  baseCurrency: string;
}

export default function DashboardOverview({
  summary,
  onNavigateToTab,
  baseCurrency,
}: DashboardOverviewProps) {
  const {
    monthIncome,
    monthSpend,
    net,
    budgetCap,
    budgetUsage,
    categoryBreakdown,
    recentTransactions,
    monthlyTrend,
  } = summary;

  // Currency Formatter Utility
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: baseCurrency || 'USD',
    }).format(amount);
  };

  // Color matching lists for categories
  const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#10B981', '#8B5CF6', '#FF007F', '#06B6D4'];

  return (
    <div className="space-y-6">
      {/* 1. KPI Card Ribbons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Monthly Income Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 transition-all duration-300 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Monthly Income</span>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-sans text-white tracking-tight">
            {formatCurrency(monthIncome)}
          </h3>
          <p className="text-xs text-emerald-400/90 font-mono flex items-center mt-2">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active cashflow inflow
          </p>
        </div>

        {/* Monthly Expenses Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-rose-500/50 transition-all duration-300 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Monthly Expenses</span>
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-sans text-white tracking-tight">
            {formatCurrency(monthSpend)}
          </h3>
          <p className="text-xs text-rose-400/90 font-mono flex items-center mt-2">
            <Clock className="w-3.5 h-3.5 mr-1" /> Real-time burn velocity
          </p>
        </div>

        {/* Net Savings Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/50 transition-all duration-300 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Net Savings</span>
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold font-sans tracking-tight ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-2">
            Current calendar surplus
          </p>
        </div>

        {/* Budget Limit Progress Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 transition-all duration-300 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Overall Budget ({Math.round(budgetUsage)}%)</span>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-sans text-white tracking-tight">
            {formatCurrency(budgetCap)}
          </h3>
          {/* Custom progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetUsage >= 100
                  ? 'bg-rose-500'
                  : budgetUsage >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(budgetUsage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Budget Violation Banner Warnings */}
      {budgetUsage >= 80 && (
        <div className={`flex items-start gap-4 p-4 rounded-2xl border text-sm animate-pulse ${
          budgetUsage >= 100 
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' 
            : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold font-sans">
              {budgetUsage >= 100 ? 'BUDGET LIMIT EXCEEDED!' : 'BUDGET TRIGGER WARNING!'}
            </p>
            <p className="text-xs font-mono opacity-90">
              Current monthly expenses ({formatCurrency(monthSpend)}) stand at{' '}
              <span className="font-bold underline">{budgetUsage}%</span> of total allocated cap ({formatCurrency(budgetCap)}). Let's review non-essential expenses immediately or chat with the Gemini AI Advisor.
            </p>
          </div>
        </div>
      )}

      {/* 3. Graphical Visual Analytics split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line Chart - 2/3 width on desktop */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-2 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-sans text-white tracking-tight">Cashflow Velocity Trends</h3>
              <p className="text-xs font-mono text-slate-400 font-medium">Historic 6-month visual analysis comparing income vs expense streams.</p>
            </div>
          </div>

          <div className="h-72 w-full mt-4">
            {monthlyTrend && monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    name="Income Stream"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    name="Expense Outflows"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm leading-relaxed text-center">
                Insufficient transaction logs to project charts.<br />Complete manual logs below.
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight">Outflow Portions</h3>
            <p className="text-xs font-mono text-slate-400 animate-pulse font-medium">Category portions of active monthly costs</p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {categoryBreakdown && categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="categoryName"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs font-mono text-center">
                No monthly outflows yet.<br />Add expenses to render breakdown!
              </div>
            )}
          </div>

          {/* Color mapping block listing categories inside the side box */}
          {categoryBreakdown && categoryBreakdown.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {categoryBreakdown.map((item, index) => (
                <div key={item.categoryName} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{item.categoryName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {item.percentage}% ({formatCurrency(item.amount)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Quick visual recent logging queue links */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <div className="absolute top-4 right-6 flex items-center space-x-1 text-xs text-blue-400 font-mono hover:underline cursor-pointer" onClick={() => onNavigateToTab('transactions')}>
          <span>View full ledger</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </div>

        <div className="space-y-1 mb-6">
          <h3 className="text-lg font-bold font-sans text-white tracking-tight flex items-center">
            Recent Ledger Queue
          </h3>
          <p className="text-xs font-mono text-slate-400 font-medium">The last 5 structural updates across your accounts</p>
        </div>

        <div className="overflow-x-auto">
          {recentTransactions && recentTransactions.length > 0 ? (
            <table className="w-full text-sm text-left text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-mono">
                  <th className="py-3 px-4 font-normal">Date</th>
                  <th className="py-3 px-4 font-normal">Description</th>
                  <th className="py-3 px-4 font-normal">Category</th>
                  <th className="py-3 px-4 font-normal">Sensing</th>
                  <th className="py-3 px-4 font-normal text-right">Raw Amount</th>
                  <th className="py-3 px-4 font-normal text-right">Base Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentTransactions.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/20 transition-all font-sans">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {t.description}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono leading-relaxed tracking-tight ${
                        t.categoryType === 'INCOME' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {t.categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono text-slate-440 uppercase">
                        {t.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs">
                      {t.amount.toFixed(2)} {t.currency}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold font-mono text-xs ${
                      t.categoryType === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {t.categoryType === 'INCOME' ? '+' : '-'}{formatCurrency(t.amountBase)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
              <p className="text-slate-500 font-mono text-sm leading-relaxed mb-4">You do not have any transaction history yet.</p>
              <button
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-mono tracking-tight cursor-pointer"
                onClick={() => onNavigateToTab('transactions')}
              >
                Create initial entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
