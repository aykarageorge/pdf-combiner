interface CombineButtonProps {
  disabled: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export default function CombineButton({
  disabled,
  isProcessing,
  onClick,
}: CombineButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`
        w-full sm:w-auto px-8 py-3 rounded-lg font-medium text-white text-lg
        transition-all duration-200
        ${
          disabled || isProcessing
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/25'
        }
      `}
    >
      {isProcessing ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing...
        </span>
      ) : (
        'Combine & Download'
      )}
    </button>
  );
}
