'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

// Global notification emitter
type Listener = (n: Notification) => void;
const listeners: Listener[] = [];

export function notify(
  type: 'success' | 'warning' | 'info',
  message: string
) {
  const n: Notification = {
    id: Math.random().toString(36).slice(2),
    type,
    message,
    timestamp: Date.now(),
  };
  for (const l of listeners) l(n);
}

const ICON_MAP = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR_MAP = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
};

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => [...prev.slice(-4), n]); // Keep max 5
  }, []);

  useEffect(() => {
    listeners.push(addNotification);
    return () => {
      const idx = listeners.indexOf(addNotification);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, [addNotification]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!notifications.length) return;
    const timer = setInterval(() => {
      setNotifications((prev) =>
        prev.filter((n) => Date.now() - n.timestamp < 4000)
      );
    }, 500);
    return () => clearInterval(timer);
  }, [notifications.length]);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!notifications.length) return null;

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 max-w-[320px]">
      {notifications.map((n) => {
        const Icon = ICON_MAP[n.type];
        return (
          <div
            key={n.id}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg border glass-panel text-sm ${COLOR_MAP[n.type]} animate-in slide-in-from-right`}
            style={{
              animation: 'panel-slide-in 0.3s ease-out',
            }}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1 text-xs">{n.message}</span>
            <button
              onClick={() => dismiss(n.id)}
              className="shrink-0 opacity-50 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
