"use client";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

// Keyframes aren't expressible as Tailwind utility classes, so they live here
// and get referenced via arbitrary `animate-[...]` values below.
const toastKeyframes = `
@keyframes toast-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-8px) scale(0.96); }
}
`;

const typeStyles = {
  success:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-700 dark:text-white dark:border-green-300",
  error:
    "bg-red-50 text-red-700 border-red-200 dark:bg-slate-900 dark:text-white dark:border-slate-700",
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
};

const closeStyles = {
  success: "text-green-400 hover:text-green-700",
  error: "text-red-400 hover:text-red-700",
  info: "text-blue-300 hover:text-blue-700",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = ++idRef.current;
    const text = message instanceof Error ? message.message : String(message);
    setToasts((prev) => [...prev, { id, message: text, type, exiting: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 350);
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);

  const success = useCallback(
    (message, duration) => addToast(message, "success", duration),
    [addToast],
  );
  const error = useCallback(
    (message, duration) => {console.log('toast error');addToast(message, "error", duration)},
    [addToast],
  );
  const info = useCallback(
    (message, duration) => addToast(message, "info", duration),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ success, error, info, addToast }}>
      <style>{toastKeyframes}</style>
      {children}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Toast({ toast, onDismiss }) {
  const icons = {
    success: (
      <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] shrink-0">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 10.5l2.5 2.5 5-5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] shrink-0">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 7l6 6M13 7l-6 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px] shrink-0">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 9v5M10 6.5v.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <div
      role="alert"
      className={`flex items-center gap-[0.65rem] py-[0.7rem] pr-[0.9rem] pl-[0.8rem] rounded-[10px] min-w-[260px] max-w-[380px] pointer-events-auto border font-sans text-[0.875rem] leading-[1.4] shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)]
        ${typeStyles[toast.type]}
        ${
          toast.exiting
            ? "animate-[toast-out_0.32s_ease_forwards]"
            : "animate-[toast-in_0.32s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        }`}
    >
      {icons[toast.type]}
      <span className="flex-1 font-bold font-sans">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className={`ml-auto shrink-0 flex items-center justify-center p-[2px] rounded bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-black/[0.06] ${closeStyles[toast.type]}`}
      >
        <svg viewBox="0 0 12 12" fill="none" className="w-[10px] h-[10px]">
          <path
            d="M1 1l10 10M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

