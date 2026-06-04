'use client';

import { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id:      string;
  message: string;
  type:    ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const ICONS: Record<ToastType, string> = {
  success: '✅',
  warning: '⚠️',
  error:   '❌',
  info:    '🏆',
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-50  border-green-200 text-green-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
  error:   'bg-red-50    border-red-200   text-red-800',
  info:    'bg-blue-50   border-blue-200  text-blue-800',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(90vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 border rounded-xl px-4 py-3 shadow-lg
                        text-sm font-medium animate-in slide-in-from-bottom-4
                        ${COLORS[t.type]}`}
          >
            <span>{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
