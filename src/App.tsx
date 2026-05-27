/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wallet,
  Coins,
  History,
  Activity,
  User,
  Settings,
  LogOut,
  Moon,
  ChevronRight,
  Shield,
  Menu,
  Clock,
  RefreshCw,
} from 'lucide-react';
import DashboardOverview from './components/DashboardOverview';
import TransactionsTab from './components/TransactionsTab';
import BudgetTab from './components/BudgetTab';
import AiAdvisorTab from './components/AiAdvisorTab';
import { DashboardSummary, User as UserProfile, Transaction, Budget, RecurringRule, Category } from './types';

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('finance_tracker_token'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authCurrency, setAuthCurrency] = useState('USD');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const isLogin = authTab === 'login';
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Layout states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');

  // Primary data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  // Local Time tracking for presentation excellence
  const localTime = "2026-05-27 13:12:14"; // Metadata local time standard

  // Refresh entire UI state helper
  const pullAllData = async (authToken = token) => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      };

      // 1. Fetch categories
      const catRes = await fetch('/api/categories', { headers });
      const catData = await catRes.json();
      setCategories(Array.isArray(catData) ? catData : []);

      // 2. Fetch transactions
      const txRes = await fetch('/api/transactions', { headers });
      const txData = await txRes.json();
      setTransactions(Array.isArray(txData) ? txData : []);

      // 3. Fetch budgets
      const budRes = await fetch('/api/budgets', { headers });
      const budData = await budRes.json();
      setBudgets(Array.isArray(budData) ? budData : []);

      // 4. Fetch recurring Rules
      const recRes = await fetch('/api/recurring', { headers });
      const recData = await recRes.json();
      setRecurringRules(Array.isArray(recData) ? recData : []);

      // 5. Fetch Dashboard Reporting summaries
      const summaryRes = await fetch('/api/reports/summary', { headers });
      const summaryData = await summaryRes.json();
      if (summaryRes.ok) {
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to pull full financial state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auth fetch handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    if (!authEmail || !authPassword) {
      setAuthError('Email and Password are required');
      setIsAuthenticating(false);
      return;
    }

    try {
      const isLogin = authTab === 'login';
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword, name: authName, currency: authCurrency };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication aborted by server');
      }

      localStorage.setItem('finance_tracker_token', data.token);
      setToken(data.token);
      setUserProfile(data.user);
      await pullAllData(data.token);
    } catch (err: any) {
      setAuthError(err.message || 'Server connection error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Trigger Log out
  const handleLogout = () => {
    localStorage.removeItem('finance_tracker_token');
    setToken(null);
    setUserProfile(null);
    setSummary(null);
    setTransactions([]);
    setBudgets([]);
    setActiveTab('dashboard');
  };

  // Profile verify fetch
  const verifyMe = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setUserProfile(data);
        await pullAllData(token);
      } else {
        // Stale session
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  // Mutator triggers for linked child state changes
  const addTransaction = async (data: any) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Could not save log entry');
    }
    await pullAllData();
  };

  const updateTransaction = async (id: string, data: any) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error('Update action aborted');
    }
    await pullAllData();
  };

  const deleteTransaction = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Delete action aborted');
    }
    await pullAllData();
  };

  const addBudget = async (data: any) => {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Setup target limit failed');
    }
    await pullAllData();
  };

  const deleteBudget = async (id: string) => {
    await fetch(`/api/budgets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await pullAllData();
  };

  const addRecurringRule = async (data: any) => {
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || 'Job registration failed');
    }
    await pullAllData();
  };

  const toggleRecurringRule = async (id: string, active: boolean) => {
    await fetch(`/api/recurring/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active }),
    });
    await pullAllData();
  };

  const deleteRecurringRule = async (id: string) => {
    await fetch(`/api/recurring/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await pullAllData();
  };

  const importCsv = async (csvText: string) => {
    const res = await fetch('/api/import/csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ csvText }),
    });
    if (!res.ok) {
      throw new Error('CSV Statement cells processing failed');
    }
    await pullAllData();
  };

  // Modify base preference configuration settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsNotice('');
    try {
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userProfile?.name,
          currency: userProfile?.currency,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Settings change failed');

      setUserProfile(data);
      setSettingsNotice('Account base parameters upgraded successfully!');
      await pullAllData();
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSettingsNotice('');
      }, 1500);
    } catch (err: any) {
      setSettingsNotice(err.message || 'Error modifying settings');
    }
  };

  useEffect(() => {
    if (token) verifyMe();
  }, [token]);

  // LOGIN SCREEN
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        {/* Top Header Label */}
        <div className="flex items-center space-x-2.5 mb-8 select-none animate-fade-in">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg ring-4 ring-blue-600/10 text-white">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-sans text-white tracking-tight flex items-center">
              Smart Expense Tracker
            </h1>
            <p className="text-[10px] text-blue-400 font-mono tracking-widest uppercase">
              Financial Intelligence Engine
            </p>
          </div>
        </div>

        {/* Auth card wrapper */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl scale-in space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl"></div>

          <div className="space-y-1.5 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              {authTab === 'login' ? 'Authentication Terminal' : 'Sign-up Protocol'}
            </h2>
            <p className="text-xs font-mono text-slate-400">
              {authTab === 'login' ? 'Enter credentials to load balance grids' : 'Create zero-cost account'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 font-sans text-sm">
            {authError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono">
                {authError}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono font-medium">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-650 focus:border-blue-500 outline-none"
                  placeholder="e.g. Rachel Green"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono font-medium">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-650 focus:border-blue-500 outline-none"
                placeholder="e.g. rachel@finance.io"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono font-medium">Password Protocol</label>
              <input
                type="password"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-650 focus:border-blue-500 outline-none"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono font-medium">Base Default Currency</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                  value={authCurrency}
                  onChange={(e) => setAuthCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl font-mono tracking-tight cursor-pointer transition-all flex items-center justify-center space-x-1"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Shield className="w-4 h-4 text-emerald-400" />
              )}
              <span>{authTab === 'login' ? 'Validate Credentials' : 'Spawn Profile'}</span>
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="text-center pt-2">
            <button
              className="text-xs text-blue-400 hover:underline cursor-pointer font-sans"
              onClick={() => {
                setAuthTab(authTab === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
            >
              {authTab === 'login' ? 'First time? Create a sign-up protocol' : 'Already registered? Login instead'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD LAYOUT
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* 1. Sidebar desktop navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800/60 hidden md:flex flex-col justify-between p-6 shrink-0 relative overflow-hidden">
        <div className="space-y-8 relative">
          {/* Platform banner brand logo */}
          <div className="flex items-center space-x-2 p-2">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white">
              <Coins className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white font-sans tracking-tight leading-none">Smart Tracker</h2>
              <span className="text-[9px] font-mono whitespace-nowrap text-blue-400 uppercase tracking-wider block mt-1">Full-Stack CFPL</span>
            </div>
          </div>

          {/* Navigation menus */}
          <nav className="space-y-1.5">
            <button
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold font-sans tracking-tight transition-all flex items-center space-x-3 cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Activity className="w-4 h-4" />
              <span>Executive Dashboard</span>
            </button>

            <button
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold font-sans tracking-tight transition-all flex items-center space-x-3 cursor-pointer ${
                activeTab === 'transactions' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
              onClick={() => setActiveTab('transactions')}
            >
              <History className="w-4 h-4" />
              <span>Statement & Logs</span>
            </button>

            <button
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold font-sans tracking-tight transition-all flex items-center space-x-3 cursor-pointer ${
                activeTab === 'budgets' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
              onClick={() => setActiveTab('budgets')}
            >
              <Wallet className="w-4 h-4" />
              <span>Budgets & Subscriptions</span>
            </button>

            <button
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold font-sans tracking-tight transition-all flex items-center space-x-3 cursor-pointer ${
                activeTab === 'advisor' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
              onClick={() => setActiveTab('advisor')}
            >
              <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span className="flex items-center justify-between flex-1">
                <span>Gemini CFP Coach</span>
                <span className="inline-block bg-cyan-400/10 text-cyan-300 px-1.5 py-0.5 rounded-md text-[8px] font-mono uppercase tracking-wider font-extrabold border border-cyan-400/20">
                  AI
                </span>
              </span>
            </button>
          </nav>
        </div>

        {/* User context quick details box */}
        <div className="space-y-4 pt-6 border-t border-slate-800/60 font-sans">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 bg-slate-950 border border-slate-700/60 rounded-xl text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-none">
                {userProfile?.name || 'Authorized Guest'}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block mt-1.5 truncate">
                Base: {userProfile?.currency || 'USD'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              className="w-full py-2 bg-slate-950 border border-slate-800/80 rounded-lg text-[10px] font-bold font-mono text-slate-400 hover:text-white hover:border-slate-650 cursor-pointer flex items-center justify-center space-x-1"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Base Currency Settings</span>
            </button>

            <button
              className="w-full py-2 bg-rose-950/10 hover:bg-rose-950/20 rounded-lg text-[10px] font-bold font-mono text-rose-400 hover:text-rose-300 cursor-pointer flex items-center justify-center space-x-1"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Session</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main content block layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Ribbon Panel */}
        <header className="p-4 bg-slate-900/60 border-b border-slate-800/60 sticky top-0 flex items-center justify-between z-10 backdrop-blur-md">
          {/* Visual logo only for small devices */}
          <div className="flex items-center space-x-2 md:hidden">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Coins className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white uppercase font-sans">Smart Tracker</span>
          </div>

          {/* Timestamp tracking presentation */}
          <div className="hidden md:flex items-center space-x-1 text-slate-400 font-mono text-[10px] uppercase">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>UTC Local Standard Connection: {localTime} (Verify 2026 Sandbox)</span>
          </div>

          {/* Quick tab menu bar for mobile layout */}
          <div className="flex md:hidden items-center space-x-1">
            <button
              className={`p-2 rounded-lg text-xs font-bold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dash
            </button>
            <button
              className={`p-2 rounded-lg text-xs font-bold ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              onClick={() => setActiveTab('transactions')}
            >
              Logs
            </button>
            <button
              className={`p-2 rounded-lg text-xs font-bold ${activeTab === 'budgets' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              onClick={() => setActiveTab('budgets')}
            >
              Caps
            </button>
            <button
              className={`p-2 rounded-lg text-xs font-bold flex items-center ${activeTab === 'advisor' ? 'bg-blue-600 text-cyan-300' : 'text-cyan-400'}`}
              onClick={() => setActiveTab('advisor')}
            >
              <Sparkles className="w-3 h-3 mr-0.5 animate-pulse" /> Advisor
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Currency settings quick trigger for mobile */}
            <button
              className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800/60 rounded-xl text-slate-400 md:hidden cursor-pointer shrink-0"
              onClick={() => setIsSettingsOpen(true)}
              title="Currency conversion settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              className="px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-[10px] font-bold font-mono tracking-tight text-white hover:bg-slate-900 cursor-pointer flex items-center space-x-1 transition-all"
              onClick={() => pullAllData()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Grids</span>
            </button>
          </div>
        </header>

        {/* Outer scrolling content body */}
        <main className="p-6 flex-1 overflow-y-auto space-y-6">
          {summary ? (
            activeTab === 'dashboard' ? (
              <DashboardOverview
                summary={summary}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                baseCurrency={userProfile?.currency || 'USD'}
              />
            ) : activeTab === 'transactions' ? (
              <TransactionsTab
                transactions={transactions}
                categories={categories}
                baseCurrency={userProfile?.currency || 'USD'}
                onAddTransaction={addTransaction}
                onUpdateTransaction={updateTransaction}
                onDeleteTransaction={deleteTransaction}
                onImportCsv={importCsv}
              />
            ) : activeTab === 'budgets' ? (
              <BudgetTab
                budgets={budgets}
                recurringRules={recurringRules}
                categories={categories}
                transactions={transactions}
                baseCurrency={userProfile?.currency || 'USD'}
                onAddBudget={addBudget}
                onDeleteBudget={deleteBudget}
                onAddRecurringRule={addRecurringRule}
                onToggleRecurringRule={toggleRecurringRule}
                onDeleteRecurringRule={deleteRecurringRule}
              />
            ) : (
              <AiAdvisorTab onAddTransaction={addTransaction} apiKeyReady={!!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'} />
            )
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-24 text-center space-y-4">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
              <p className="text-xs font-mono text-slate-400 animate-pulse uppercase">
                Loading financial grids connection...
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal (Base Currency Configuration) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="space-y-1">
              <h3 className="text-md font-bold font-sans text-white tracking-tight flex items-center">
                <Settings className="w-4 h-4 text-blue-400 mr-1" /> General Ledger Settings
              </h3>
              <p className="text-xs text-slate-400 font-mono">Customize default exchange parameters.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-sm font-sans pt-2">
              {settingsNotice && (
                <div className="p-3 bg-blue-950/40 border border-blue-850 rounded-xl text-blue-300 text-xs font-mono">
                  {settingsNotice}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Dispay Name Preference</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-blue-500 outline-none"
                  value={userProfile?.name || ''}
                  onChange={(e) =>
                    setUserProfile(userProfile ? { ...userProfile, name: e.target.value } : null)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Change Base Currency Target</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-blue-500 outline-none"
                  value={userProfile?.currency || 'USD'}
                  onChange={(e) =>
                    setUserProfile(userProfile ? { ...userProfile, currency: e.target.value } : null)
                  }
                >
                  <option value="USD">USD ($) Standard Base</option>
                  <option value="INR">INR (₹) Standard Base</option>
                  <option value="EUR">EUR (€) Standard Base</option>
                  <option value="GBP">GBP (£) Standard Base</option>
                  <option value="JPY">JPY (¥) Standard Base</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl font-mono text-xs cursor-pointer"
                >
                  Upgrade parameters
                </button>
                <button
                  type="button"
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl text-slate-400 font-mono text-xs cursor-pointer"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

