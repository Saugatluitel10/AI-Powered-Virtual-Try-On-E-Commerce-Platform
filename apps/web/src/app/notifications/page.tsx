"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Loader2, Package, CreditCard, Tag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  order_status: Package,
  payment: CreditCard,
  price_drop: Tag,
  style_recommendation: Sparkles,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    loadNotifications(page);
  }, [page]);

  async function loadNotifications(p: number) {
    setLoading(true);
    try {
      const res = await api.get<{
        data: {
          items: Notification[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      }>(`/notifications?page=${p}&pageSize=20`);
      setNotifications(res.data.data.items);
      setTotalPages(res.data.data.totalPages);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
    } finally {
      setMarkingAll(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          </div>
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={markAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <Card
                  key={n.id}
                  className={`cursor-pointer transition-colors ${
                    !n.isRead ? "bg-purple-50/50 border-purple-200" : ""
                  }`}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        !n.isRead
                          ? "bg-purple-100 text-purple-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            !n.isRead ? "text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
