import React from 'react';
import { SimplifiedDebt, CurrencyCode } from '../../types/models';
import { formatCurrency } from '../../utils/formatters';
import { Avatar } from '../common/Avatar';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';

interface DebtGraphProps {
  simplifiedDebts: SimplifiedDebt[];
  currency: CurrencyCode;
  onSettleDebt: (debt: SimplifiedDebt) => void;
}

export const DebtGraph: React.FC<DebtGraphProps> = ({
  simplifiedDebts,
  currency,
  onSettleDebt,
}) => {
  if (simplifiedDebts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">All Settled Up!</h4>
        <p className="text-xs text-text-secondary mt-1">
          No pending debts in this group. Everyone is even.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Zap className="w-3.5 h-3.5 text-royal" />
          <span>Optimal Simplified Settlements ({simplifiedDebts.length})</span>
        </div>
        <span className="text-[11px] text-text-secondary">
          Min-cash-flow graph solver active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {simplifiedDebts.map((debt, index) => (
          <div
            key={`${debt.from_user_id}-${debt.to_user_id}-${index}`}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-royal/30 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={debt.from_profile?.full_name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-navy truncate">
                  {debt.from_profile?.full_name || 'Member'}
                </p>
                <p className="text-[10px] text-rose-600 font-medium">owes</p>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-1" />

              <Avatar name={debt.to_profile?.full_name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-navy truncate">
                  {debt.to_profile?.full_name || 'Member'}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">gets back</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 pl-3">
              <span className="text-sm font-bold font-mono text-navy">
                {formatCurrency(debt.amount_paise, currency)}
              </span>
              <button
                onClick={() => onSettleDebt(debt)}
                className="px-2.5 py-1 rounded-lg bg-royal/10 text-royal hover:bg-royal hover:text-white text-xs font-semibold transition-all"
              >
                Settle
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

