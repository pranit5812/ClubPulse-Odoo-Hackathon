import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertCircle, Info, ShieldAlert, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { api } from '../api/client';

export const NotificationDropdown = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.get('/api/notifications');
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s poll
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkAsRead = async (id, targetRoute) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (targetRoute) {
        setOpen(false);
        navigate(targetRoute);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        className="relative p-2 rounded-xl text-[#687086] hover:text-[#171A2B] hover:bg-[#F7F8FC] border border-transparent hover:border-[#E7E9F1] transition-colors"
        title="Operational Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#D9485F] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E7E9F1] p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E7E9F1]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#171A2B]">Operational Alerts</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#D9485F]/10 text-[#D9485F]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8B93A7]">
                No operational alerts at this time.
              </div>
            ) : (
              notifications.map((n) => {
                const isCrit = n.severity === 'critical';
                const isWarn = n.severity === 'warning';
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.target_route)}
                    className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                      !n.is_read
                        ? 'bg-[#F7F8FC] border-[#625BF6]/30 font-medium'
                        : 'bg-white border-[#E7E9F1] opacity-75'
                    } hover:border-[#625BF6] hover:bg-[#EEEDFE]/40`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {isCrit ? (
                          <ShieldAlert className="w-4 h-4 text-[#D9485F] shrink-0" />
                        ) : isWarn ? (
                          <AlertCircle className="w-4 h-4 text-[#C97A16] shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-[#625BF6] shrink-0" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-[#171A2B] truncate text-xs">{n.title}</span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#625BF6] shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#687086] mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        {n.target_route && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#625BF6]">
                            <span>Take action</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
