import React, { useState } from 'react';
import { GroupCategory, CurrencyCode } from '../../types/models';
import { Modal } from '../common/Modal';
import { groupService } from '../../services/groupService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CURRENCY_SYMBOLS } from '../../utils/formatters';
import { Check, AlertCircle } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CATEGORIES: GroupCategory[] = ['Trip', 'Home', 'Couple', 'Project', 'Friends', 'Other'];
const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED'];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('Trip');
  const [currency, setCurrency] = useState<CurrencyCode>(user?.default_currency || 'INR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await groupService.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        currency,
        created_by: user?.id || 'guest',
      });

      showToast(`Group "${name}" created successfully!`, 'success');
      setName('');
      setDescription('');
      onGroupCreated();
      onClose();
    } catch (err: any) {
      console.error('Group creation failed:', err);
      setError(err.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Expense Group"
      subtitle="Organize shared trips, flats, dinners, or projects"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">
            Group Name
          </label>
          <input
            type="text"
            placeholder="e.g. Manali Roadtrip 🏔️, Flat 301, Dinner Club"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-fintech"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as GroupCategory)}
              className="input-fintech text-sm"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase">
              Currency
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as CurrencyCode)}
              className="input-fintech text-sm font-mono"
            >
              {CURRENCIES.map(curr => (
                <option key={curr} value={curr}>
                  {curr} ({CURRENCY_SYMBOLS[curr]})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Brief details about expenses in this group"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input-fintech text-sm resize-none"
          />
        </div>

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
            <span>Create Group</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

