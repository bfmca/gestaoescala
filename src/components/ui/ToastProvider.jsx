import { createContext, useContext, useState } from 'react';

import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function showToast(type, title, description = '') {
    const id = crypto.randomUUID();

    setToasts((prev) => [
      ...prev,
      {
        id,
        type,
        title,
        description,
      },
    ]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  const toast = {
    success: (title, description) => showToast('success', title, description),

    error: (title, description) => showToast('error', title, description),

    warning: (title, description) => showToast('warning', title, description),

    info: (title, description) => showToast('info', title, description),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="fixed top-6 right-6 z-[9999] space-y-3 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }) {
  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-900',
    },

    error: {
      icon: XCircle,
      border: 'border-rose-200',
      bg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      titleColor: 'text-rose-900',
    },

    warning: {
      icon: AlertTriangle,
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
    },

    info: {
      icon: Info,
      border: 'border-sky-200',
      bg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      titleColor: 'text-sky-900',
    },
  };

  const item = config[toast.type] || config.info;
  const Icon = item.icon;

  return (
    <div
      className={`
        rounded-2xl
        border
        ${item.border}
        ${item.bg}
        shadow-lg
        px-4
        py-4
        flex
        gap-3
        animate-[toastIn_0.25s_ease-out]
      `}
    >
      <div className={`mt-0.5 ${item.iconColor}`}>
        <Icon size={22} />
      </div>

      <div className="flex-1">
        <div className={`font-bold text-sm ${item.titleColor}`}>
          {toast.title}
        </div>

        {toast.description && (
          <div className="text-sm text-slate-600 mt-1 leading-relaxed">
            {toast.description}
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 transition"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }

  return context;
}
