import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm
}: ConfirmDialogProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
    <div className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-neutral-400">{message}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-700 py-2.5 text-sm text-neutral-200"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
