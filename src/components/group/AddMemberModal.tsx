import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { groupService } from '../../services/groupService';
import { useToast } from '../../context/ToastContext';
import { UserPlus, AlertCircle } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onMemberAdded: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onMemberAdded,
}) => {
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter an email address or name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await groupService.addMember(groupId, identifier.trim());
      showToast(`Member added to "${groupName}"!`, 'success');
      setIdentifier('');
      onMemberAdded();
      onClose();
    } catch (err: any) {
      console.error('Failed to add member:', err);
      setError(err.message || 'Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Group Member"
      subtitle={`Invite a friend to "${groupName}"`}
      maxWidth="sm"
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
            Email or Name
          </label>
          <input
            type="text"
            placeholder="e.g. friend@example.com or Priya Sharma"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className="input-fintech text-sm"
            autoFocus
            required
          />
          <p className="text-[11px] text-text-secondary">
            Existing registered users will be linked directly to their profile.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
            className="btn-primary flex items-center gap-1.5"
            disabled={submitting}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

