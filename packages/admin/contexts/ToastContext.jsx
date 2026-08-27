"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = ++idRef.current;
    const text = message instanceof Error ? message.message : String(message);
    setToasts((prev) => [...prev, { id, message: text, type, exiting: false }]);

    setTimeout(() => {
      // Mark as exiting to trigger exit animation
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      // Remove after animation
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
    (message, duration) => addToast(message, "error", duration),
    [addToast],
  );

  const info = useCallback(
    (message, duration) => addToast(message, "info", duration),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ success, error, info, addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
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
      <svg viewBox="0 0 20 20" fill="none" className="toast-icon">
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
      <svg viewBox="0 0 20 20" fill="none" className="toast-icon">
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
      <svg viewBox="0 0 20 20" fill="none" className="toast-icon">
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
      className={`toast toast--${toast.type} ${toast.exiting ? "toast--exit" : ""}`}
      role="alert"
    >
      {icons[toast.type]}
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 12 12" fill="none">
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
