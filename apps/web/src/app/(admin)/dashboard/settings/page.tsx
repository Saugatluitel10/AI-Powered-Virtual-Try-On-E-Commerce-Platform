"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Globe, Bell, Shield, Database } from "lucide-react";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    orderAlerts: true,
    lowStock: true,
    newUsers: false,
    returnRequests: true,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[28px] text-primary">Settings</h1>
        <p className="text-on-surface-variant text-sm mt-1">Platform configuration and preferences</p>
      </div>

      {/* Admin Profile */}
      <div className="border border-outline-variant/30 mb-6">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
            <Shield className="w-4 h-4 text-secondary" />
            Admin Profile
          </h3>
        </div>
        <div className="p-5 flex items-center gap-6">
          <div className="w-16 h-16 bg-primary flex items-center justify-center text-on-primary font-display text-xl">
            {user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div>
            <p className="font-medium text-primary text-lg">
              {user?.user_metadata?.name ?? "Admin"}
            </p>
            <p className="text-on-surface-variant text-sm">{user?.email}</p>
            <span className="inline-block mt-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-secondary-container text-secondary">
              Administrator
            </span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="border border-outline-variant/30 mb-6">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
            <Bell className="w-4 h-4 text-secondary" />
            Notification Preferences
          </h3>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {[
            { key: "orderAlerts" as const, label: "New Order Alerts", desc: "Get notified when new orders are placed" },
            { key: "lowStock" as const, label: "Low Stock Warnings", desc: "Alert when product stock falls below threshold" },
            { key: "newUsers" as const, label: "New User Signups", desc: "Notification for each new user registration" },
            { key: "returnRequests" as const, label: "Return Requests", desc: "Alert when customers request returns" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">{label}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`relative w-11 h-6 transition-colors ${
                  notifications[key] ? "bg-secondary" : "bg-outline-variant"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-on-primary transition-transform ${
                    notifications[key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Settings */}
      <div className="border border-outline-variant/30 mb-6">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
            <Globe className="w-4 h-4 text-secondary" />
            Platform
          </h3>
        </div>
        <div className="divide-y divide-outline-variant/20">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Default Currency</p>
              <p className="text-[11px] text-on-surface-variant">NPR (Nepalese Rupee)</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container px-3 py-1.5">
              NPR
            </span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Primary Market</p>
              <p className="text-[11px] text-on-surface-variant">Nepal</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container px-3 py-1.5">
              NP
            </span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Payment Gateways</p>
              <p className="text-[11px] text-on-surface-variant">eSewa, Khalti, Stripe</p>
            </div>
            <span className="inline-flex gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container px-2 py-1">eSewa</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container px-2 py-1">Khalti</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container px-2 py-1">Stripe</span>
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-outline-variant/30">
        <div className="p-5 border-b border-outline-variant/30">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant flex items-center gap-2">
            <Database className="w-4 h-4 text-secondary" />
            External Tools
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-outline-variant/30 p-4 text-center hover:border-secondary transition-colors"
          >
            <p className="text-sm font-medium text-primary">Supabase</p>
            <p className="text-[10px] text-on-surface-variant mt-1">Database & Auth</p>
          </a>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-outline-variant/30 p-4 text-center hover:border-secondary transition-colors"
          >
            <p className="text-sm font-medium text-primary">Stripe</p>
            <p className="text-[10px] text-on-surface-variant mt-1">Payments</p>
          </a>
          <a
            href="https://sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-outline-variant/30 p-4 text-center hover:border-secondary transition-colors"
          >
            <p className="text-sm font-medium text-primary">Sentry</p>
            <p className="text-[10px] text-on-surface-variant mt-1">Error Monitoring</p>
          </a>
        </div>
      </div>
    </div>
  );
}
