import { useEffect } from 'react';
import './Toast.css';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    // Close each notification after a short time.
    const timer = window.setTimeout(onDismiss, 3600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  const isError = toast.type === 'error';

  return (
    <div
      className={'toast toast-' + toast.type}
      role={isError ? 'alert' : 'status'}
    >
      <span className="toast-mark" aria-hidden="true">
        {isError ? '!' : 'OK'}
      </span>
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        X
      </button>
    </div>
  );
}
