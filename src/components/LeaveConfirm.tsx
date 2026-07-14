interface LeaveConfirmProps {
  joinCode: string;
  onStay: () => void;
  onLeave: () => void;
}

export const LeaveConfirm = ({ joinCode, onStay, onLeave }: LeaveConfirmProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
    <div className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-center">
      <p className="font-semibold text-white">Leave this game?</p>
      <p className="mt-1 text-sm text-neutral-400">
        You can rejoin with the code <span className="font-mono text-white">{joinCode}</span>.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onStay}
          className="flex-1 rounded-lg border border-neutral-700 py-2.5 text-sm text-neutral-200"
        >
          Stay
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white"
        >
          Leave
        </button>
      </div>
    </div>
  </div>
);
