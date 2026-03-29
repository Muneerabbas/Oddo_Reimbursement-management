import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import inboxService from '../../services/inboxService';

const toneClass = {
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-rose-100 text-rose-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-slate-100 text-slate-700',
};

const formatWhen = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString();
};

const NotificationBell = ({ userId, role }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const notifications = await inboxService.fetchNotifications(role);
      setItems(notifications);
      setUnreadCount(inboxService.getUnreadCount(userId, notifications));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(id);
  }, [role]);

  useEffect(() => {
    const handler = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const sortedItems = useMemo(() => items.slice().sort((a, b) => b.ts - a.ts), [items]);

  const markAllRead = () => {
    inboxService.markAllRead(userId, items);
    setUnreadCount(0);
  };

  const openPanel = () => {
    setOpen((prev) => !prev);
    if (!open) {
      void refresh();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={openPanel}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-semibold text-slate-800">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>

          <div className="max-h-[380px] overflow-auto">
            {loading ? (
              <p className="px-4 py-4 text-sm text-slate-500">Loading...</p>
            ) : sortedItems.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">No updates yet.</p>
            ) : (
              sortedItems.map((n) => (
                <Link
                  key={n.id}
                  to={n.href || '/'}
                  onClick={() => {
                    inboxService.markRead(userId, n.id);
                    setUnreadCount((c) => Math.max(0, c - 1));
                    setOpen(false);
                  }}
                  className="block px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${toneClass[n.tone] || toneClass.info}`}>
                      {n.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatWhen(n.ts)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
