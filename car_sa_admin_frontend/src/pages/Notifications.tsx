import { useEffect, useState } from 'react';
import api from '../services/api';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 50 };
      if (filter === 'unread') params.read = false;
      if (filter === 'read') params.read = true;
      const response = await api.getNotifications(params);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread || 0);
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    setError(null);
    try {
      const response = await api.markNotificationRead(id);
      if (response.error) {
        setError(response.error);
        return;
      }
      fetchNotifications();
    } catch (err) {
      setError('Failed to mark as read');
      console.error(err);
    }
  };

  const markAllRead = async () => {
    setError(null);
    try {
      const response = await api.markAllNotificationsRead();
      if (response.error) {
        setError(response.error);
        return;
      }
      fetchNotifications();
    } catch (err) {
      setError('Failed to mark all as read');
      console.error(err);
    }
  };

  const deleteNotification = async (id: number) => {
    const confirmed = window.confirm('Delete this notification?');
    if (!confirmed) return;
    setError(null);
    try {
      const response = await api.deleteNotification(id);
      if (response.error) {
        setError(response.error);
        return;
      }
      fetchNotifications();
    } catch (err) {
      setError('Failed to delete notification');
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            You have {unreadCount} unread notification(s)
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Mark All Read
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-56">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FEA14C]"></div>
            <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No notifications found.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li key={notification.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{notification.title}</h3>
                      {!notification.read && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(notification.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
