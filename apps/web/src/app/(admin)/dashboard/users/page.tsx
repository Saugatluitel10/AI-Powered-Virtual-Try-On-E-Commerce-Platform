"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, Shield, ShoppingBag, User as UserIcon } from "lucide-react";
import api from "@/lib/api";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api
      .get<{ data: { totalUsers: number } }>("/admin/dashboard")
      .then((res) => {
        setTotal(res.data.data.totalUsers ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[28px] text-primary">Users</h1>
          <p className="text-on-surface-variant text-sm mt-1">Platform user overview</p>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-outline-variant/30 border border-outline-variant/30 mb-8">
        <div className="bg-surface p-6 text-center">
          <Users className="w-6 h-6 text-secondary mx-auto mb-3" />
          <p className="font-display text-[32px] text-primary">{total}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-1">Total Users</p>
        </div>
        <div className="bg-surface p-6 text-center">
          <Shield className="w-6 h-6 text-secondary mx-auto mb-3" />
          <p className="font-display text-[32px] text-primary">—</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-1">Admin Users</p>
        </div>
        <div className="bg-surface p-6 text-center">
          <ShoppingBag className="w-6 h-6 text-secondary mx-auto mb-3" />
          <p className="font-display text-[32px] text-primary">—</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-1">Brand Members</p>
        </div>
      </div>

      <div className="border border-outline-variant/30 p-8 text-center">
        <UserIcon className="w-10 h-10 text-outline-variant mx-auto mb-4" />
        <p className="font-display text-lg text-primary mb-2">User Management</p>
        <p className="text-on-surface-variant text-sm max-w-md mx-auto">
          User management requires direct database access via Supabase dashboard.
          User records are created automatically when customers sign up. Role changes
          can be made through the Supabase console or Prisma Studio.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-on-primary px-6 py-3 text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-on-surface-variant transition-all"
          >
            Supabase Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
