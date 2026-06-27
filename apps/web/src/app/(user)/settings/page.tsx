"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Download, Trash2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

interface NotificationSettings {
  emailMarketing: boolean;
  emailOrders: boolean;
  emailTryOn: boolean;
  pushEnabled: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get<{ data: NotificationSettings }>("/users/me/notifications")
      .then((res) => setSettings(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      await api.patch("/users/me/notifications", settings);
    } catch {}
    setSaving(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get("/users/me/export", { responseType: "blob" });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vtryon-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== "DELETE_MY_ACCOUNT") return;
    setDeleting(true);
    try {
      await api.delete("/users/me", {
        data: { confirmation: "DELETE_MY_ACCOUNT" },
      });
      router.push("/");
    } catch {}
    setDeleting(false);
  }

  function Toggle({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button
          onClick={() => onChange(!checked)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            checked ? "bg-purple-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>

            {settings && (
              <div className="divide-y">
                <Toggle
                  label="Marketing emails"
                  description="New products, promotions, and style tips"
                  checked={settings.emailMarketing}
                  onChange={(v) => setSettings({ ...settings, emailMarketing: v })}
                />
                <Toggle
                  label="Order updates"
                  description="Order confirmations, shipping, and delivery notifications"
                  checked={settings.emailOrders}
                  onChange={(v) => setSettings({ ...settings, emailOrders: v })}
                />
                <Toggle
                  label="Try-on notifications"
                  description="Get notified when your virtual try-on results are ready"
                  checked={settings.emailTryOn}
                  onChange={(v) => setSettings({ ...settings, emailTryOn: v })}
                />
                <Toggle
                  label="Push notifications"
                  description="Browser push notifications for important updates"
                  checked={settings.pushEnabled}
                  onChange={(v) => setSettings({ ...settings, pushEnabled: v })}
                />
              </div>
            )}

            <Button
              className="mt-4 bg-purple-600 hover:bg-purple-700"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save preferences
            </Button>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Data & Privacy</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Export your data</p>
                  <p className="text-xs text-gray-500">Download all your data as a JSON file</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                  Export
                </Button>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Delete account</p>
                    <p className="text-xs text-red-600">Permanently delete your account and all data</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-100"
                    onClick={() => setShowDelete(!showDelete)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>

                {showDelete && (
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-sm text-red-700 mb-3">
                      Type <strong>DELETE_MY_ACCOUNT</strong> to confirm:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE_MY_ACCOUNT"
                        className="flex-1"
                      />
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting || deleteConfirm !== "DELETE_MY_ACCOUNT"}
                      >
                        {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        Confirm
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
