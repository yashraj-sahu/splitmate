import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  PieChart, 
  Users, 
  Receipt,
  Layers,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, toPaise } from '../utils/formatters';
import { splitEqual } from '../utils/calculator';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Interactive Live Calculation Demo on Landing Page
  const [calcAmount, setCalcAmount] = useState('1500');
  const [calcPeople, setCalcPeople] = useState(4);

  const parsedPaise = toPaise(calcAmount);
  const peopleIds = Array.from({ length: calcPeople }, (_, i) => `Person ${i + 1}`);
  const liveSplits = splitEqual(parsedPaise, peopleIds);

  return (
    <div className="min-h-screen bg-fintech-bg text-text-primary selection:bg-royal/20 selection:text-royal-dark">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-royal to-royal-light flex items-center justify-center shadow-lg shadow-royal/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-navy">
                Split<span className="text-royal">Mate</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary block -mt-1">
                Fintech Expense Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary flex items-center gap-2 text-sm">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-navy hover:text-royal transition-colors px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-royal/10 border border-royal/20 text-royal text-xs font-semibold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <Zap className="w-3.5 h-3.5" />
            <span>Next-Gen Financial Expense Sharing</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-navy tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Split Expenses. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-royal via-royal-light to-royal-dark">
              Not Friendships.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Eliminate awkward money conversations with mathematical integer-paise precision, automatic debt graph simplification, and multiple-payer splits.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? "/dashboard" : "/login"}
              className="btn-primary px-8 py-3.5 text-base shadow-lg shadow-royal/25 hover:shadow-royal/40 w-full sm:w-auto"
            >
              <span>Launch SplitMate</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <a
              href="#interactive-demo"
              className="btn-secondary px-6 py-3.5 text-base w-full sm:w-auto"
            >
              Try Live Calculator
            </a>
          </div>

          {/* Feature Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-text-secondary">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Zero Floating-Point Error (Paise Arithmetic)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Min-Cash-Flow Debt Simplification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Supabase Row-Level Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sandbox Preview */}
      <section id="interactive-demo" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-royal font-semibold text-xs uppercase tracking-wider mb-2">
              <Calculator className="w-4 h-4" />
              <span>Interactive Engine Sandbox</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-navy">
              Experience Integer Paise Remainder Distribution
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              Unlike ordinary split apps that lose fractions of cents, SplitMate guarantees exact penny balance across all participants.
            </p>
          </div>

          <div className="card-fintech max-w-3xl mx-auto shadow-fintech-lg border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase block mb-1.5">
                  Total Bill Amount (₹)
                </label>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={e => setCalcAmount(e.target.value)}
                  className="input-fintech text-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase block mb-1.5">
                  Number of Friends ({calcPeople})
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={calcPeople}
                  onChange={e => setCalcPeople(parseInt(e.target.value, 10))}
                  className="w-full accent-royal h-2 bg-slate-200 rounded-lg cursor-pointer mt-3"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <span className="text-xs font-semibold text-navy uppercase tracking-wider block mb-3">
                Calculated Breakdown (Exact to the single paise):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(liveSplits).map(([person, paise], i) => (
                  <div key={person} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                    <span className="text-[11px] font-medium text-text-secondary block">
                      {person}
                    </span>
                    <span className="text-sm font-bold font-mono text-royal block mt-1">
                      {formatCurrency(paise, 'INR')}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      {paise} paise
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-royal">
            Fintech Architecture
          </span>
          <h2 className="text-3xl font-extrabold text-navy tracking-tight mt-2">
            Built for Real World Group Spending
          </h2>
          <p className="text-sm text-text-secondary mt-3">
            Designed specifically to handle nuanced scenarios: unequal contributions, multi-currency trips, and minimum-transaction settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card-fintech">
            <div className="w-12 h-12 rounded-xl bg-royal/10 text-royal flex items-center justify-center mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy">Debt Simplification</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Greedy min-cash-flow graph algorithms eliminate cyclical repayments. If A owes B and B owes C, SplitMate routes payments directly from A to C.
            </p>
          </div>

          <div className="card-fintech">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy">Multi-Payer Splitting</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Did two friends split a ₹15,000 hotel deposit with unequal card charges? SplitMate supports multiple simultaneous payers with custom splits.
            </p>
          </div>

          <div className="card-fintech">
            <div className="w-12 h-12 rounded-xl bg-navy/10 text-navy flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-navy">Database Enforced RLS</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Protected by PostgreSQL Row Level Security. Users only access expenses from their registered groups, and administrators are verified on the server.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-navy text-white py-14 border-t border-navy-light/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-royal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              SplitMate
            </span>
          </div>

          <p className="text-xs text-slate-400 text-center sm:text-right">
            &copy; 2026 SplitMate. "Split Expenses. Not Friendships." All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

