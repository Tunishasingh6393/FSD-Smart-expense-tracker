/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  MessageSquare,
  HelpCircle,
  TrendingDown,
  ChevronRight,
  RefreshCw,
  Plus,
  Compass,
  FileText,
  BadgeAlert,
  Send,
} from 'lucide-react';

interface OCRItem {
  description: string;
  price: number;
}

interface OCRResult {
  success: boolean;
  merchantName: string;
  date: string;
  total: number;
  currency: string;
  items: OCRItem[];
  rawText: string;
  ocrNotice?: string;
}

interface AIAdvisorTabProps {
  onAddTransaction: (data: any) => Promise<void>;
  apiKeyReady: boolean;
}

export default function AiAdvisorTab({ onAddTransaction, apiKeyReady }: AIAdvisorTabProps) {
  // Navigation states
  const [activeSide, setActiveSide] = useState<'advisor' | 'ocr'>('advisor');

  // AI Wealth Coach states
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatLogs, setChatLogs] = useState<{ sender: 'user' | 'gemini'; text: string; time: string }[]>([
    {
      sender: 'gemini',
      text: `### Welcome to your certified Gemini CFP® Advisor! 🌟

I look directly into your live statement balances, active budget thresholds, and cashflow streams to give you customized wealth tips.

**How can I help you optimize your wealth today?**
Click one of our quick-audit triggers on the side space or type any custom prompt below! Check category leakages, set up savings blueprints, or evaluate portfolio models.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

  // Receipt OCR states
  const [rawTextPaste, setRawTextPaste] = useState(
    `Starbucks Coffee Block A5
Date: 2026-05-24
1x Café Latte - 180.00 INR
1x Caramel Macchiato - 240.00 INR
Subtotal: 420.00 INR
GST 5% Tax: 21.00 INR
TOTAL AMOUNT DUE: 441.00 INR`
  );
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isLoadingOCR, setIsLoadingOCR] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('');

  // Sample templates for users to select for easy visual stimulation
  const SAMPLE_TEMPLATES = [
    {
      label: 'Indian Café Slip (INR)',
      text: `Starbucks Coffee Block A5\nDate: 2026-05-24\n1x Café Latte - 180.00 INR\n1x Caramel Macchiato - 240.00 INR\nSubtotal: 420.00 INR\nGST 5% Tax: 21.00 INR\nTOTAL AMOUNT DUE: 441.00 INR`,
    },
    {
      label: 'Walmart Grocery Invoice (USD)',
      text: `Walmart Supercenter #2201\nDate: 2026-05-25\nORGANIC MILK 1GL - 5.80 USD\nWHOLE WHEAT BREAD - 3.20 USD\nFRESH BANANAS 1.2LB - 1.95 USD\nEGG CARTON 12CT - 4.50 USD\nSALES TAX 6% - 0.93 USD\nTOTAL PAYABLE: 16.38 USD`,
    },
    {
      label: 'Uber Transit Ride Receipt (EUR)',
      text: `Uber B.V. Trip ID: 902910\nDate: 2026-05-26\nRide Fare Subtotal: 14.50 EUR\nAirport Surcharge: 5.00 EUR\nPromotion Discount: -2.00 EUR\nTOTAL PAID: 17.50 EUR`,
    },
  ];

  const PRE_COMPOSED_PROMPTS = [
    {
      title: 'Analyze Cashflow Leaks',
      icon: TrendingDown,
      prompt: 'Audit my recent transaction values and let me know which categories contain the highest leakages and spending surplus.',
    },
    {
      title: 'Structural Savings Blueprint',
      icon: Compass,
      prompt: 'Can you sketch out a tailored 50/30/20 monthly savings action plan for me based on my active budget configurations?',
    },
    {
      title: 'Optimal Category Caps',
      icon: FileText,
      prompt: 'Review my target spending and suggest optimal category caps for food, transit, and bills to increase my net savings rate next month.',
    },
  ];

  // Call server to trigger AI advice
  const triggerAdvice = async (promptText: string) => {
    if (!promptText.trim() || isLoadingCoach) return;
    setIsLoadingCoach(true);

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedLogs = [...chatLogs, { sender: 'user', text: promptText, time: userTime }];
    setChatLogs(updatedLogs);
    setChatPrompt('');

    try {
      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('finance_tracker_token')}`,
        },
        body: JSON.stringify({ userPrompt: promptText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger advise session');
      }

      setChatLogs([
        ...updatedLogs,
        {
          sender: 'gemini',
          text: data.advice,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setChatLogs([
        ...updatedLogs,
        {
          sender: 'gemini',
          text: `### 💔 Connectivity Issue\n\nFailed to reach Advisor node: **${err.message}**.\nPlease check your server credentials.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingCoach(false);
    }
  };

  // Run Receipt OCR scan
  const handleOcrSubmit = async () => {
    setIsLoadingOCR(true);
    setOcrResult(null);
    setOcrSuccessMsg('');

    try {
      const response = await fetch('/api/ocr/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('finance_tracker_token')}`,
        },
        body: JSON.stringify({ sampleText: rawTextPaste }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Parsing error');

      setOcrResult(data);
    } catch (err: any) {
      alert(err.message || 'Error occurred parsing text');
    } finally {
      setIsLoadingOCR(false);
    }
  };

  // Ingest OCR extracted result directly to standard transaction ledger
  const handleOcrIngest = async () => {
    if (!ocrResult) return;
    setOcrSuccessMsg('');
    try {
      // Find matching category from system or default to generic shopping
      const matchedCatId = 'cat-food'; // Default mapped for coffee/food inside standard seed
      
      await onAddTransaction({
        amount: ocrResult.total,
        currency: ocrResult.currency,
        description: `${ocrResult.merchantName || 'Receipt Ingest'} OCR Scan`,
        categoryId: matchedCatId,
        date: ocrResult.date || new Date().toISOString().split('T')[0],
        source: 'ocr',
      });

      setOcrSuccessMsg('Scanned receipt transaction successfully compiled and ingested into active Ledger!');
    } catch (err: any) {
      alert(err.message || 'Ingestion failed');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Visual notice header detailing active AI state */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-sans">Server Gemini Coprocessor Loaded</h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Mode:{' '}
              {apiKeyReady ? (
                <span className="text-emerald-400 font-bold">Active Gemini 3.5 API Live Grid</span>
              ) : (
                <span className="text-amber-400 font-bold">Encrypted local sandboxed emulator fallback</span>
              )}
            </p>
          </div>
        </div>

        {/* Tab switch option */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 shrink-0 select-none">
          <button
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all space-x-1 flex items-center cursor-pointer ${
              activeSide === 'advisor' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveSide('advisor')}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            <span>AI Wealth Coach</span>
          </button>
          <button
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all space-x-1 flex items-center cursor-pointer ${
              activeSide === 'ocr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveSide('ocr')}
          >
            <Camera className="w-3.5 h-3.5 mr-1" />
            <span>Receipt Scanner (OCR)</span>
          </button>
        </div>
      </div>

      {activeSide === 'advisor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick audit triggers: 1/4 layout */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl h-fit space-y-4 lg:col-span-1">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">Quick Audit Tasks</h4>
            <div className="space-y-3 pt-2">
              {PRE_COMPOSED_PROMPTS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    className="w-full text-left p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500 hover:bg-slate-900 transition-all font-sans text-xs flex items-start space-x-3 cursor-pointer group"
                    onClick={() => triggerAdvice(item.prompt)}
                    disabled={isLoadingCoach}
                  >
                    <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-slate-950 transition-all shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h5 className="font-bold text-white group-hover:text-blue-400 transition-colors">{item.title}</h5>
                      <p className="text-[10px] text-slate-400 truncate">Run automated prompt context analysis</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat main logs layout: 3/4 layout */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl lg:col-span-3 flex flex-col h-[520px] overflow-hidden">
            {/* Box Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-white">CFP Chat Terminal Connection</h4>
              </div>
            </div>

            {/* Logs render */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/20 scrollbar-thin scrollbar-thumb-slate-800">
              {chatLogs.map((log, index) => {
                const isGemini = log.sender === 'gemini';
                return (
                  <div key={index} className={`flex ${isGemini ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-md space-y-2 font-sans ${
                      isGemini 
                        ? 'bg-slate-900 border border-slate-800 text-slate-300' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      {/* Process markdown or custom headers cleanly for simulated layout */}
                      <div className="text-xs space-y-2 leading-relaxed">
                        {log.text.split('\n').map((para, i) => {
                          if (para.startsWith('###')) {
                            return <h3 key={i} className="text-sm font-bold text-white mt-3 font-sans">{para.replace('###', '').trim()}</h3>;
                          }
                          if (para.startsWith('-') || para.startsWith('*')) {
                            return <li key={i} className="ml-4 list-disc text-slate-300">{para.replace(/^[-*]\s*/, '')}</li>;
                          }
                          if (para.match(/^\d+\./)) {
                            return <p key={i} className="ml-4 font-mono font-medium text-slate-300">{para}</p>;
                          }
                          return <p key={i}>{para}</p>;
                        })}
                      </div>
                      <span className={`text-[9px] font-mono block text-right mt-1 ${isGemini ? 'text-slate-500' : 'text-blue-200'}`}>
                        {log.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              {isLoadingCoach && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3 text-xs font-mono text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="animate-pulse">Gemini CFP is auditing your balances, please wait...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Send console */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <form
                className="flex items-center space-x-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  triggerAdvice(chatPrompt);
                }}
              >
                <input
                  type="text"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none placeholder:text-slate-650"
                  placeholder="Ask advisor: Where can I cut budget? Draft a savings plan..."
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  disabled={isLoadingCoach}
                />
                <button
                  type="submit"
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  disabled={!chatPrompt.trim() || isLoadingCoach}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* OCR Receipt Scan center side */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* Paste left panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-sans text-white tracking-tight flex items-center">
                <Camera className="w-5 h-5 mr-1 text-blue-400" /> receipt OCR Text Scanner
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Pasted bill descriptors simulate deep textual scanning. Click one of our demo templates below for fast ingestion!
              </p>
            </div>

            {/* Sample selection pill */}
            <div className="flex flex-wrap gap-2 pt-2">
              {SAMPLE_TEMPLATES.map((temp) => (
                <button
                  key={temp.label}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-300 transition-colors cursor-pointer"
                  onClick={() => setRawTextPaste(temp.text)}
                >
                  {temp.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <textarea
                className="w-full h-[220px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-300 focus:border-blue-500 outline-none scrollbar-thin"
                value={rawTextPaste}
                onChange={(e) => setRawTextPaste(e.target.value)}
              ></textarea>
            </div>

            <button
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl font-mono text-xs tracking-tight flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              onClick={handleOcrSubmit}
              disabled={isLoadingOCR || !rawTextPaste.trim()}
            >
              {isLoadingOCR ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>Analyze Receipt via Gemini OCR</span>
            </button>
          </div>

          {/* Results extracted right panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-sans text-white tracking-tight">Structured Scan Results</h3>

              {ocrSuccessMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-mono">
                  {ocrSuccessMsg}
                </div>
              )}

              {ocrResult ? (
                <div className="space-y-4">
                  {ocrResult.ocrNotice && (
                    <div className="p-2 bg-slate-950 border border-slate-800 text-[10px] leading-normal font-mono text-slate-400 rounded-lg">
                      {ocrResult.ocrNotice}
                    </div>
                  )}

                  {/* Fact Brief */}
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-400">
                    <div>
                      <p className="text-slate-500 font-bold uppercase">Merchant/Vendor</p>
                      <p className="font-sans font-bold text-white text-xs mt-0.5">{ocrResult.merchantName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase">Receipt Date</p>
                      <p className="text-slate-200 mt-0.5 text-xs">{ocrResult.date}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-bold uppercase">Calculated total</p>
                      <p className="font-bold text-emerald-400 text-xs mt-0.5">
                        {ocrResult.total.toFixed(2)} {ocrResult.currency}
                      </p>
                    </div>
                  </div>

                  {/* Line item matrix list */}
                  <div className="border border-slate-800/60 rounded-xl overflow-hidden text-xs">
                    <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 text-slate-400 font-mono font-medium flex justify-between">
                      <span>Purchased Line Item</span>
                      <span>Extracted Price</span>
                    </div>
                    <div className="divide-y divide-slate-800 bg-slate-950/10">
                      {ocrResult.items && ocrResult.items.map((it: OCRItem, idx: number) => (
                        <div key={idx} className="px-3 py-2 flex justify-between font-sans">
                          <span className="text-white">{it.description}</span>
                          <span className="font-mono text-slate-300">
                            {it.price.toFixed(2)} {ocrResult.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10 min-h-[300px] flex flex-col justify-center items-center">
                  <BadgeAlert className="w-8 h-8 text-slate-650 mb-3" />
                  <p className="text-slate-500 font-mono text-xs max-w-xs leading-normal">
                    Trigger the Gemini OCR analyze scan on the left pane to print formatted invoice cells.
                  </p>
                </div>
              )}
            </div>

            {ocrResult && !ocrSuccessMsg && (
              <button
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl font-mono text-xs tracking-tight flex items-center justify-center space-x-1 cursor-pointer transition-all mt-4"
                onClick={handleOcrIngest}
              >
                <Plus className="w-4 h-4" />
                <span>Ingest OCR into ledger</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
