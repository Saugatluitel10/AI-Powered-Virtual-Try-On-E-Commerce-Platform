export type BodyType =
  | "HOURGLASS"
  | "PEAR"
  | "APPLE"
  | "RECTANGLE"
  | "INVERTED_TRIANGLE";

export interface BodyProfile {
  id: string;
  userId: string;
  heightCm: number | null;
  weightKg: number | null;
  bustCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  shoulderWidthCm: number | null;
  bodyType: BodyType | null;
  photoUrl: string | null;
  analysisComplete: boolean;
  updatedAt: string;
}
