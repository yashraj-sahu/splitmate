import React, { useState, useEffect } from 'react';
import { 
  toPaise, 
  fromPaise, 
  formatCurrency 
} from '../../utils/formatters';
import { 
  splitEqual, 
  validateExactSplit, 
  splitPercentage, 
  splitShares, 
  validatePayers 
} from '../../utils/calculator';
import { 
  Group, 
  GroupMember, 
  ExpenseCategory, 
  SplitMethod, 
  CurrencyCode 
} from '../../types/models';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { expenseService } from '../../services/expenseService';
import { Users, AlertCircle, DollarSign, Split, Check } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
  onExpenseAdded: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  'Food', 
  'Travel', 
  'Utilities', 
  'Entertainment', 
  'Housing', 
  'Shopping', 
  'Other'
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  onExpenseAdded,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Payers state
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState(user?.id || members[0]?.user_id || '');
  const [multiPayerAmounts, setMultiPayerAmounts] = useState<Record<string, string>>({});

  // Split states
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [exactSplitAmounts, setExactSplitAmounts] = useState<Record<string, string>>({});
  const [percentageSplits, setPercentageSplits] = useState<Record<string, string>>({});
  const [shareSplits, setShareSplits] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize selected members whenever members change or modal opens
  useEffect(() => {
    if (members.length > 0) {
      const allIds = members.map(m => m.user_id);
      setSelectedMemberIds(allIds);
      if (user?.id && allIds.includes(user.id)) {
        setSinglePayerId(user.id);
      } else {
        setSinglePayerId(allIds[0]);
      }
      
      // Default shares
      const initialShares: Record<string, string> = {};
      allIds.forEach(id => { initialShares[id] = '1'; });
      setShareSplits(initialShares);

      // Default equal percentages
      const initialPcts: Record<string, string> = {};
      const pct = (100 / allIds.length).toFixed(2);
      allIds.forEach(id => { initialPcts[id] = pct; });
      setPercentageSplits(initialPcts);
    }
  }, [members, user, isOpen]);

  const totalPaise = toPaise(amountStr);

  // Calculate live splits breakdown
  const computedSplits: Record<string, number> = React.useMemo(() => {
    if (totalPaise <= 0 || selectedMemberIds.length === 0) return {};

    if (splitMethod === 'equal') {
      return splitEqual(totalPaise, selectedMemberIds);
    }

    if (splitMethod === 'exact') {
      const exactPaiseMap: Record<string, number> = {};
      selectedMemberIds.forEach(id => {
        exactPaiseMap[id] = toPaise(exactSplitAmounts[id] || '0');
      });
      return exactPaiseMap;
    }

    if (splitMethod === 'percentage') {
      const pcts: Record<string, number> = {};
      selectedMemberIds.forEach(id => {
        pcts[id] = parseFloat(percentageSplits[id] || '0');
      });
      const res = splitPercentage(totalPaise, pcts);
      return res.valid ? res.splits : {};
    }

    if (splitMethod === 'shares') {
      const shares: Record<string, number> = {};
      selectedMemberIds.forEach(id => {
        shares[id] = parseInt(shareSplits[id] || '1', 10);
      });
      const res = splitShares(totalPaise, shares);
      return res.valid ? res.splits : {};
    }

    return {};
  }, [totalPaise, selectedMemberIds, splitMethod, exactSplitAmounts, percentageSplits, shareSplits]);

  const toggleMemberSelection = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(prev => prev.filter(id => id !== memberId));
      }
    } else {
      setSelectedMemberIds(prev => [...prev, memberId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Please enter an expense title.');
      return;
    }

    if (totalPaise <= 0) {
      setValidationError('Amount must be greater than zero.');
      return;
    }

    if (selectedMemberIds.length === 0) {
      setValidationError('At least one member must be included in the split.');
      return;
    }

    // 1. Validate Payers
    let finalPayers: { user_id: string; amount_paid_paise: number }[] = [];
    if (!isMultiPayer) {
      finalPayers = [{ user_id: singlePayerId, amount_paid_paise: totalPaise }];
    } else {
      const payerPaiseMap: Record<string, number> = {};
      members.forEach(m => {
        payerPaiseMap[m.user_id] = toPaise(multiPayerAmounts[m.user_id] || '0');
      });
      const validation = validatePayers(totalPaise, payerPaiseMap);
      if (!validation.valid) {
        setValidationError(validation.error || 'Total paid by members does not equal expense total.');
        return;
      }
      finalPayers = Object.entries(payerPaiseMap)
        .filter(([_, paise]) => paise > 0)
        .map(([user_id, amount_paid_paise]) => ({ user_id, amount_paid_paise }));
    }

    // 2. Validate Splits
    let finalSplits: { user_id: string; owed_amount_paise: number; percentage?: number; shares?: number }[] = [];
    if (splitMethod === 'exact') {
      const validation = validateExactSplit(totalPaise, computedSplits);
      if (!validation.valid) {
        setValidationError(validation.error || 'Exact split sum must match total amount.');
        return;
      }
    } else if (splitMethod === 'percentage') {
      const totalPct = selectedMemberIds.reduce((acc, id) => acc + (parseFloat(percentageSplits[id] || '0')), 0);
      if (Math.abs(totalPct - 100) > 0.05) {
        setValidationError(`Percentages sum to ${totalPct.toFixed(1)}%, must equal 100%`);
        return;
      }
    }

    finalSplits = selectedMemberIds.map(id => ({
      user_id: id,
      owed_amount_paise: computedSplits[id] || 0,
      percentage: splitMethod === 'percentage' ? parseFloat(percentageSplits[id] || '0') : undefined,
      shares: splitMethod === 'shares' ? parseInt(shareSplits[id] || '1', 10) : undefined,
    }));

    try {
      setSubmitting(true);
      await expenseService.createExpense({
        group_id: group.id,
        title: title.trim(),
        description: description.trim() || undefined,
        amount_paise: totalPaise,
        currency: group.currency as CurrencyCode,
        category,
        split_method: splitMethod,
        expense_date: expenseDate,
        created_by: user?.id || singlePayerId,
        payers: finalPayers,
        splits: finalSplits,
      });

      showToast(`Expense "${title}" created successfully!`, 'success');
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      console.error('Failed to create expense:', err);
      setValidationError(err.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Expense"
      subtitle={`In group "${group.name}"`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {validationError && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{validationError}</p>
          </div>
        )}

        {/* Title & Amount Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Description / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Seafood Dinner, Grocery Run, Cab to Hotel"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-fintech"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Amount ({group.currency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="input-fintech font-mono text-base font-semibold"
                required
              />
            </div>
          </div>
        </div>

        {/* Category & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="input-fintech text-sm"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Expense Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              className="input-fintech text-sm"
              required
            />
          </div>
        </div>

        {/* Paid By Section */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy">
              Who Paid?
            </span>
            <button
              type="button"
              onClick={() => setIsMultiPayer(!isMultiPayer)}
              className="text-xs font-medium text-royal hover:underline"
            >
              {isMultiPayer ? 'Switch to Single Payer' : 'Multiple People Paid?'}
            </button>
          </div>

          {!isMultiPayer ? (
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const isSelected = singlePayerId === m.user_id;
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setSinglePayerId(m.user_id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-royal text-white border-royal shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Avatar name={m.profile?.full_name} size="xs" />
                    <span>{m.profile?.full_name || m.user_id}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              <p className="text-xs text-text-secondary mb-2">
                Specify exact amounts paid by each contributor:
              </p>
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.profile?.full_name} size="xs" />
                    <span className="text-navy font-medium">{m.profile?.full_name}</span>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={multiPayerAmounts[m.user_id] || ''}
                      onChange={e => setMultiPayerAmounts({
                        ...multiPayerAmounts,
                        [m.user_id]: e.target.value
                      })}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-right font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Split Method Selector Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Split Option
            </label>
            <span className="text-xs text-text-secondary">
              Included: {selectedMemberIds.length} / {members.length} members
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
            {(['equal', 'exact', 'percentage', 'shares'] as SplitMethod[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setSplitMethod(mode)}
                className={`py-1.5 rounded-lg capitalize transition-all ${
                  splitMethod === mode
                    ? 'bg-white text-royal shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Members Split Details List */}
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto">
          {members.map(m => {
            const isIncluded = selectedMemberIds.includes(m.user_id);
            const calculatedOwedPaise = computedSplits[m.user_id] || 0;

            return (
              <div 
                key={m.user_id} 
                className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                  isIncluded ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isIncluded}
                    onChange={() => toggleMemberSelection(m.user_id)}
                    className="w-4 h-4 rounded text-royal focus:ring-royal/20 border-slate-300"
                  />
                  <Avatar name={m.profile?.full_name} size="xs" />
                  <div>
                    <span className="font-medium text-navy block">
                      {m.profile?.full_name}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {m.profile?.email}
                    </span>
                  </div>
                </div>

                {isIncluded && (
                  <div className="flex items-center gap-2">
                    {/* Mode specific input */}
                    {splitMethod === 'exact' && (
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={exactSplitAmounts[m.user_id] || ''}
                          onChange={e => setExactSplitAmounts({
                            ...exactSplitAmounts,
                            [m.user_id]: e.target.value
                          })}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-right font-mono text-xs"
                        />
                      </div>
                    )}

                    {splitMethod === 'percentage' && (
                      <div className="flex items-center gap-1 w-20">
                        <input
                          type="number"
                          step="0.1"
                          value={percentageSplits[m.user_id] || ''}
                          onChange={e => setPercentageSplits({
                            ...percentageSplits,
                            [m.user_id]: e.target.value
                          })}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-right font-mono text-xs"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    )}

                    {splitMethod === 'shares' && (
                      <div className="flex items-center gap-1 w-20">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={shareSplits[m.user_id] || '1'}
                          onChange={e => setShareSplits({
                            ...shareSplits,
                            [m.user_id]: e.target.value
                          })}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-right font-mono text-xs"
                        />
                        <span className="text-slate-400">sh</span>
                      </div>
                    )}

                    <span className="font-mono font-semibold text-navy min-w-[70px] text-right">
                      {formatCurrency(calculatedOwedPaise, group.currency as CurrencyCode)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={submitting}
          >
            {submitting ? (
              <span>Saving Expense...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Expense ({formatCurrency(totalPaise, group.currency as CurrencyCode)})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

