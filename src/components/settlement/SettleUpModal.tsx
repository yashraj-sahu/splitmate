import React, { useState, useEffect } from 'react';
import { Group, GroupMember, CurrencyCode } from '../../types/models';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { toPaise, formatCurrency, fromPaise } from '../../utils/formatters';
import { expenseService } from '../../services/expenseService';
import { useToast } from '../../context/ToastContext';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  members: GroupMember[];
  initialPayerId?: string;
  initialPayeeId?: string;
  initialAmountPaise?: number;
  onSettled: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  initialPayerId,
  initialPayeeId,
  initialAmountPaise,
  onSettled,
}) => {
  const { showToast } = useToast();

  const [payerId, setPayerId] = useState(initialPayerId || members[0]?.user_id || '');
  const [payeeId, setPayeeId] = useState(initialPayeeId || members[1]?.user_id || '');
  const [amountStr, setAmountStr] = useState(initialAmountPaise ? fromPaise(initialAmountPaise).toString() : '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPayerId) setPayerId(initialPayerId);
    if (initialPayeeId) setPayeeId(initialPayeeId);
    if (initialAmountPaise) setAmountStr(fromPaise(initialAmountPaise).toString());
  }, [initialPayerId, initialPayeeId, initialAmountPaise, isOpen]);

  const totalPaise = toPaise(amountStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (payerId === payeeId) {
      setError('Payer and payee cannot be the same person.');
      return;
    }

    if (totalPaise <= 0) {
      setError('Settlement amount must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await expenseService.createSettlement({
        group_id: group.id,
        payer_id: payerId,
        payee_id: payeeId,
        amount_paise: totalPaise,
        currency: group.currency as CurrencyCode,
        notes: notes.trim() || undefined,
      });

      showToast(`Settlement of ${formatCurrency(totalPaise, group.currency as CurrencyCode)} recorded!`, 'success');
      onSettled();
      onClose();
    } catch (err: any) {
      console.error('Settlement error:', err);
      setError(err.message || 'Failed to record settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  const payerMember = members.find(m => m.user_id === payerId);
  const payeeMember = members.find(m => m.user_id === payeeId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record a Settlement"
      subtitle={`In group "${group.name}"`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Visual flow: Payer -> Payee */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
            <Avatar name={payerMember?.profile?.full_name} size="md" />
            <span className="text-xs font-semibold text-navy truncate max-w-[100px]">
              {payerMember?.profile?.full_name || 'Payer'}
            </span>
            <span className="text-[10px] text-text-secondary">Payer (Sent)</span>
          </div>

          <div className="flex flex-col items-center px-3">
            <ArrowRight className="w-5 h-5 text-royal animate-pulse" />
            <span className="text-[10px] font-mono text-royal font-semibold mt-1">
              {formatCurrency(totalPaise, group.currency as CurrencyCode)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
            <Avatar name={payeeMember?.profile?.full_name} size="md" />
            <span className="text-xs font-semibold text-navy truncate max-w-[100px]">
              {payeeMember?.profile?.full_name || 'Payee'}
            </span>
            <span className="text-[10px] text-text-secondary">Payee (Received)</span>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Paid By
            </label>
            <select
              value={payerId}
              onChange={e => setPayerId(e.target.value)}
              className="input-fintech text-xs"
            >
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.user_id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Paid To
            </label>
            <select
              value={payeeId}
              onChange={e => setPayeeId(e.target.value)}
              className="input-fintech text-xs"
            >
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.user_id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">
            Amount Paid ({group.currency})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            className="input-fintech text-lg font-mono font-semibold"
            required
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">
            Payment Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Paid via UPI, Google Pay, Cash"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-fintech text-xs"
          />
        </div>

        {/* Actions */}
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
            <Check className="w-4 h-4" />
            <span>Confirm Settlement</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

