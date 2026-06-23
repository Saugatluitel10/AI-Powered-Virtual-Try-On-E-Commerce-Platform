"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Ruler,
  Palette,
  ShoppingBag,
  Shirt,
  Sparkles,
  Loader2,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface BodyProfileData {
  heightCm: number | null;
  bustCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  shoulderWidthCm: number | null;
  bodyType: string | null;
  analysisComplete: boolean;
}

interface StyleProfileData {
  preferredStyles: string[];
  occasions: string[];
  colorPalette: string[];
  quizCompleted: boolean;
}

export default function ProfilePage() {
  const { user: authUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bodyProfile, setBodyProfile] = useState<BodyProfileData | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [userRes, bodyRes, styleRes] = await Promise.allSettled([
          api.get<{ data: UserProfile }>("/users/me"),
          api.get<{ data: BodyProfileData }>("/users/me/body-profile"),
          api.get<{ data: StyleProfileData }>("/users/me/style-profile"),
        ]);

        if (userRes.status === "fulfilled") setProfile(userRes.value.data.data);
        if (bodyRes.status === "fulfilled") setBodyProfile(bodyRes.value.data.data);
        if (styleRes.status === "fulfilled") setStyleProfile(styleRes.value.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Account info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  {profile?.name ?? "User"}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email ?? authUser?.email}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body Profile */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-purple-600" />
                Body Profile
              </h2>
              <Link href="/upload">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  {bodyProfile?.analysisComplete ? "Re-scan" : "Set up"}
                </Button>
              </Link>
            </div>

            {bodyProfile?.analysisComplete ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {bodyProfile.bodyType && (
                  <div className="col-span-2 sm:col-span-3">
                    <Badge className="bg-purple-100 text-purple-700 text-sm px-3 py-1">
                      {bodyProfile.bodyType} body type
                    </Badge>
                  </div>
                )}
                {[
                  { label: "Height", value: bodyProfile.heightCm, unit: "cm" },
                  { label: "Bust", value: bodyProfile.bustCm, unit: "cm" },
                  { label: "Waist", value: bodyProfile.waistCm, unit: "cm" },
                  { label: "Hips", value: bodyProfile.hipsCm, unit: "cm" },
                  { label: "Shoulders", value: bodyProfile.shoulderWidthCm, unit: "cm" },
                ]
                  .filter((m) => m.value)
                  .map((m) => (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{m.label}</p>
                      <p className="font-semibold text-gray-900">
                        {m.value?.toFixed(0)} {m.unit}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Upload a full-body photo to get your body measurements and AI-powered
                size recommendations.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Style Profile */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Style Preferences
              </h2>
              <Link href="/onboarding">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  {styleProfile?.quizCompleted ? "Edit" : "Take quiz"}
                </Button>
              </Link>
            </div>

            {styleProfile?.quizCompleted ? (
              <div className="space-y-3">
                {styleProfile.preferredStyles.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Styles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {styleProfile.preferredStyles.map((s) => (
                        <Badge key={s} variant="secondary" className="capitalize">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {styleProfile.occasions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Occasions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {styleProfile.occasions.map((o) => (
                        <Badge key={o} variant="secondary" className="capitalize">
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {styleProfile.colorPalette.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Colors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {styleProfile.colorPalette.map((c) => (
                        <Badge key={c} variant="secondary" className="capitalize">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Take our quick style quiz to get personalized recommendations.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="space-y-2">
          {[
            { href: "/orders", icon: ShoppingBag, label: "My Orders" },
            { href: "/wardrobe", icon: Shirt, label: "My Wardrobe" },
            { href: "/stylist", icon: Sparkles, label: "AI Stylist" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">{label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
