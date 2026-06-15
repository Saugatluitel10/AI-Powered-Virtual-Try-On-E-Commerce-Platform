export type UserRole = "customer" | "retailer_admin" | "super_admin";
export type FitPreference = "slim" | "regular" | "relaxed";
export type MeasurementsSource = "manual" | "ai_estimated" | "mediapipe";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface BodyProfile {
  id: string;
  user_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  shoulder_width_cm: number | null;
  inseam_cm: number | null;
  skin_tone: string | null;
  fit_preference: FitPreference | null;
  style_tags: string[] | null;
  profile_photo_url: string | null;
  measurements_source: MeasurementsSource | null;
  updated_at: string;
}
