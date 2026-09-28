'use client';

import React from 'react';
import { CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContainerProps {
  toasts: ToastItem[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={14} className="text-emerald" />}
          {toast.type === 'info' && <Info size={14} style={{ color: 'var(--text-highlight)' }} />}
          {toast.type === 'warning' && <AlertTriangle size={14} className="text-amber" />}
          {toast.type === 'error' && <AlertCircle size={14} className="text-danger" />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
