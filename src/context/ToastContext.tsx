import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
}

interface ToastContextType {
  toast: {
    success: (message: string, options?: { title?: string }) => void;
    error: (message: string, options?: { title?: string }) => void;
    warning: (message: string, options?: { title?: string }) => void;
    info: (message: string, options?: { title?: string }) => void;
  };
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info', title?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const toast = useMemo(
    () => ({
      success: (msg: string, opt?: { title?: string }) => addToast(msg, 'success', opt?.title),
      error: (msg: string, opt?: { title?: string }) => addToast(msg, 'error', opt?.title),
      warning: (msg: string, opt?: { title?: string }) => addToast(msg, 'warning', opt?.title),
      info: (msg: string, opt?: { title?: string }) => addToast(msg, 'info', opt?.title),
    }),
    [addToast]
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      addToast(message, type);
    },
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md animate-slide-up transition-all ${
              t.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : t.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : t.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : 'bg-blue-50/95 border-blue-200 text-blue-900'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              {t.title && <h4 className="font-semibold text-sm mb-0.5">{t.title}</h4>}
              <p className="text-xs leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

export function useToastBase() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastBase must be used within ToastProvider');
  return ctx;
}
