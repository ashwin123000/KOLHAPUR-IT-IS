import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../services/api';

/**
 * NotificationPanel — Bell icon with dropdown showing notifications from DB.
 * Props: userId (string)
 */
const NotificationPanel = ({ userId }) => {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchNotifs = () => {
    if (!userId) return;
    notificationsAPI.getForUser(userId)
      .then(res => setNotifs(res.data?.data || []))
      .catch(() => {});
  };

  // Poll every 10 seconds
  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 10000);
    return () => clearInterval(iv);
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const markRead = (id) => {
    notificationsAPI.markRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return d.toLocaleDateString();
    } catch (_) { return ts; }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b bg-slate-50">
            <span className="font-bold text-sm text-slate-800">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !n.isRead ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-400">{n.senderName && `From: ${n.senderName}`}</p>
                    <p className="text-[10px] text-slate-400">{formatTime(n.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t bg-slate-50">
              <button
                onClick={() => {
                  notifs.forEach(n => !n.isRead && markRead(n.id));
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
