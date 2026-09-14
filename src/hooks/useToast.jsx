// Simple toast notification system
import { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'bg-low/15', border: 'border-low/40', icon: 'text-low' },
  error: { bg: 'bg-critical/15', border: 'border-critical/40', icon: 'text-critical' },
  warning: { bg: 'bg-moderate/15', border: 'border-moderate/40', icon: 'text-moderate' },
  info: { bg: 'bg-primary/15', border: 'border-primary/40', icon: 'text-primary' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            const c = COLORS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl max-w-sm ${c.bg} ${c.border}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${c.icon}`} />
                <span className="text-xs text-text-primary font-medium flex-1">{t.message}</span>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
