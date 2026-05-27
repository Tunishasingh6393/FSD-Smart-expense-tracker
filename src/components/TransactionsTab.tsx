/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PlusCircle,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Check,
  X,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Transaction, Category } from '../types';

interface TransactionsTabProps {
  transactions: Transaction[];
  categories: Category[];
  baseCurrency: string;
  onAddTransaction: (data: any) => Promise<void>;
  onUpdateTransaction: (id: string, data: any) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onImportCsv: (csvText: string) => Promise<void>;
}

export default function TransactionsTab({
  transactions,
  categories,
  baseCurrency,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onImportCsv,
}: TransactionsTabProps) {
  // Navigation states
  const [subTab, setSubTab] = useState<'list' | 'bulk'>('list');

  // Manual Transaction creation states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency || 'USD');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<'manual' | 'csv' | 'ocr'>('manual');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing transaction state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');

  // Searching & filtering state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // CSV paste Ingestion states
  const [csvPasteText, setCsvPasteText] = useState(
    `# Format: Date, Description, Amount, Currency, Category
2026-05-24, Corner Cafe, -15.50, USD, Food & Dining
2026-05-25, Tech Company Salary, 3400.00, USD, Salary
2026-05-26, Monthly Apartment Rent, -1200.00, USD, Housing & Rent
2026-05-27, Daily Subway Cab, -8.75, USD, Transport & Cab`
  );
  const [csvNotice, setCsvNotice] = useState('');
  const [isIngestingCVS, setIsIngestingCSV] = useState(false);

  // Currency utility formatting
  const formatValue = (val: number, cur: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur || 'USD',
    }).format(val);
  };

  // Run Add Transaction
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError('Amount must be a positive number');
      return;
    }
    if (!description.trim()) {
      setFormError('Description is required');
      return;
    }
    if (!categoryId) {
      setFormError('Please select a structural category');
      return;
    }

    try {
      await onAddTransaction({
        amount: parseFloat(amount),
        currency,
        description,
        categoryId,
        date,
        source: 'manual',
      });
      setSuccessMsg('Transaction registered successfully!');
      setAmount('');
      setDescription('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit transaction');
    }
  };

  // Run Bulk Pasted CSV Statement Ingest
  const handleBulkSubmit = async () => {
    setCsvNotice('');
    setIsIngestingCSV(true);
    try {
      const cleanText = csvPasteText
        .trim()
        .split('\n')
        .filter((l) => !l.startsWith('#') && l.trim() !== '')
        .join('\n');

      if (!cleanText) {
        setCsvNotice('Please paste valid CSV lines first!');
        setIsIngestingCSV(false);
        return;
      }

      await onImportCsv(cleanText);
      setCsvNotice('Bulk statement records mapped and ingested successfully!');
      setIsIngestingCSV(false);
      setSubTab('list');
    } catch (err: any) {
      setCsvNotice(err.message || 'Error occurred during parsing statements');
      setIsIngestingCSV(false);
    }
  };

  // Edit action triggers
  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditAmount(t.amount.toString());
    setEditCurrency(t.currency);
    setEditDescription(t.description);
    setEditCategoryId(t.categoryId || '');
    setEditDate(t.date);
  };

  const saveEdit = async (id: string) => {
    try {
      await onUpdateTransaction(id, {
        amount: parseFloat(editAmount),
        currency: editCurrency,
        description: editDescription,
        categoryId: editCategoryId,
        date: editDate,
      });
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save changes');
    }
  };

  // Filtering application logic
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || t.categoryId === selectedCategory;
    const matchesType =
      selectedType === 'ALL' ||
      (selectedType === 'INCOME' && t.categoryType === 'INCOME') ||
      (selectedType === 'EXPENSE' && t.categoryType === 'EXPENSE');

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Tab select option header - visual polish */}
      <div className="flex border-b border-slate-800">
        <button
          className={`px-5 py-3 text-sm font-sans font-bold flex items-center space-x-2 border-b-2 tracking-tight transition-all cursor-pointer ${
            subTab === 'list'
              ? 'border-blue-500 text-white bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setSubTab('list')}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ledger & Manual Log</span>
        </button>
        <button
          className={`px-5 py-3 text-sm font-sans font-bold flex items-center space-x-2 border-b-2 tracking-tight transition-all cursor-pointer ${
            subTab === 'bulk'
              ? 'border-blue-500 text-white bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setSubTab('bulk')}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV Statement Ingest</span>
        </button>
      </div>

      {subTab === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form col: 1/3 layout */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-fit space-y-4">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight flex items-center">
              <Plus className="w-5 h-5 mr-1" /> Add Transaction
            </h3>
            <p className="text-xs font-mono text-slate-400">Append high-fidelity manual records. Converts instantly to base currency.</p>

            <form onSubmit={handleAddSubmit} className="space-y-4 font-sans text-sm mt-4">
              {formError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs font-mono">
                  {formError}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-mono">
                  {successMsg}
                </div>
              )}

              {/* Amount Row */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Value Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-blue-500 outline-none placeholder:text-slate-600"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Currency Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Currency Feed</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-blue-500 outline-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Receipt Descriptor</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none placeholder:text-slate-600"
                  placeholder="e.g. Organic Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Assigned Category Ledger</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Choose Category --</option>
                  {/* Expense categories */}
                  <optgroup label="Expense Outflows">
                    {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                  {/* Income categories */}
                  <optgroup label="Income Streams">
                    {categories
                      .filter((c) => c.type === 'INCOME')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-mono">Settlement Date</label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:border-blue-500 outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl font-mono tracking-tight cursor-pointer transition-all flex items-center justify-center space-x-1"
              >
                <span>Save Ledger Log</span>
              </button>
            </form>
          </div>

          {/* Table list: 2/3 layout */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl lg:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold font-sans text-white tracking-tight">Financial Ledger Logs</h3>
                <p className="text-xs font-mono text-slate-400">Total matched: {filteredTransactions.length} records</p>
              </div>

              {/* In-tab structural search inputs */}
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                {/* Text Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    className="bg-slate-950 text-xs text-white pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 outline-none w-44 focus:border-blue-500 font-sans"
                    placeholder="Search query..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Category Selector */}
                <div className="relative">
                  <select
                    className="bg-slate-950 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-800 outline-none focus:border-blue-500 pr-6"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <select
                    className="bg-slate-950 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-800 outline-none focus:border-blue-500 pr-6"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                  >
                    <option value="ALL">All Flows</option>
                    <option value="INCOME">Inflows (+)</option>
                    <option value="EXPENSE">Outflows (-)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Render items list */}
            <div className="overflow-x-auto">
              {filteredTransactions.length > 0 ? (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-mono">
                      <th className="py-3 px-4 font-normal">Details</th>
                      <th className="py-3 px-4 font-normal">Port/Category</th>
                      <th className="py-3 px-4 font-normal text-right">Raw Amount</th>
                      <th className="py-3 px-4 font-normal text-right">Base Conversion</th>
                      <th className="py-3 px-4 font-normal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredTransactions.map((t) => {
                      const isEditing = editingId === t.id;
                      return (
                        <tr key={t.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  className="bg-slate-950 text-xs border border-slate-700 rounded px-2 py-1 text-white w-full"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                />
                                <input
                                  type="date"
                                  className="bg-slate-950 text-[11px] border border-slate-700 rounded px-2 py-0.5 text-slate-300 font-mono"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                />
                              </div>
                            ) : (
                              <div>
                                <p className="font-semibold text-white">{t.description}</p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(t.date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}{' '}
                                  via{' '}
                                  <span className="uppercase text-slate-500 font-bold">{t.source}</span>
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-sans">
                            {isEditing ? (
                              <select
                                className="bg-slate-950 text-xs border border-slate-700 rounded px-2 py-1 text-white"
                                value={editCategoryId}
                                onChange={(e) => setEditCategoryId(e.target.value)}
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.type})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono leading-relaxed whitespace-nowrap ${
                                t.categoryType === 'INCOME'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {t.categoryName || 'Uncategorized'}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-xs">
                            {isEditing ? (
                              <div className="flex items-center space-x-1 justify-end">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="bg-slate-950 text-xs border border-slate-700 rounded px-2 py-1 text-white w-20 text-right font-mono"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                />
                                <select
                                  className="bg-slate-950 text-xs border border-slate-700 rounded p-1 text-white text-[11px]"
                                  value={editCurrency}
                                  onChange={(e) => setEditCurrency(e.target.value)}
                                >
                                  <option value="USD">USD</option>
                                  <option value="INR">INR</option>
                                  <option value="EUR">EUR</option>
                                  <option value="GBP">GBP</option>
                                  <option value="JPY">JPY</option>
                                </select>
                              </div>
                            ) : (
                              <span>
                                {t.amount} {t.currency}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {!isEditing && (
                              <span className={`font-mono text-xs font-bold leading-relaxed ${
                                t.categoryType === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'
                              }`}>
                                {t.categoryType === 'INCOME' ? '+' : '-'}
                                {formatValue(t.amountBase, baseCurrency)}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"
                                  onClick={() => saveEdit(t.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                                  onClick={() => startEditing(t)}
                                >
                                  <Edit3 className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                                  onClick={() => onDeleteTransaction(t.id)}
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                  <p className="text-slate-500 font-mono text-sm leading-relaxed">No matching transactions in logs found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CSV Ingestion active playground subTab */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-w-4xl mx-auto">
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-sans text-white tracking-tight flex items-center">
              <UploadCloud className="w-5 h-5 mr-1 text-blue-400" /> Bank Copy-Paste CSV Ingester
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Bulk paste statement rows to import at once. We'll automatically identify categories using keyword mapping filters.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {csvNotice && (
              <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-blue-300 text-xs font-mono">
                {csvNotice}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono">Pasted Statement Lines (comma or semicolon separated):</label>
              <textarea
                className="w-full h-56 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 font-mono text-xs focus:border-blue-500 outline-none scrollbar-thin"
                placeholder="2026-05-24, Descriptor, Amount, Currency, Category"
                value={csvPasteText}
                onChange={(e) => setCsvPasteText(e.target.value)}
              ></textarea>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono block">
                Required syntax: <code className="text-slate-400">Date (YYYY-MM-DD), Details, Value (positive or negative), Currency Code (optional), Category (optional)</code>
              </span>
              <button
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl font-mono text-xs tracking-tight flex items-center space-x-1 cursor-pointer transition-all disabled:opacity-50"
                onClick={handleBulkSubmit}
                disabled={isIngestingCVS}
              >
                {isIngestingCVS ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>Ingest Bulk Statements</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
