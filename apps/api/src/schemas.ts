import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  accessToken: z.string().min(1),
  newPassword: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
  type: z.enum(["signup", "email"]).optional(),
});

export const socialAuthSchema = z.object({
  provider: z.enum(["google", "facebook"]),
});

export const syncUserSchema = z.object({
  name: z.string().optional(),
});

export const registerBrandSchema = z.object({
  brandName: z.string().trim().min(1),
});

// ─── Cart ────────────────────────────────────────────────────────────────────

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
});

export const updateCartSchema = z.object({
  quantity: z.number().int().min(1),
});

export const syncCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    quantity: z.number().int().min(1),
  })).default([]),
});

// ─── Orders ──────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  shippingAddress: z.record(z.string(), z.string()),
  paymentMethod: z.enum(["stripe", "esewa", "khalti", "cod"]),
  discountCode: z.string().optional(),
});

export const returnOrderSchema = z.object({
  items: z.array(z.object({
    orderItemId: z.string().min(1),
    quantity: z.number().int().min(1),
  })).min(1),
  reason: z.string().trim().min(1),
});

export const refundOrderSchema = z.object({
  reason: z.string().trim().min(1),
});

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentOrderIdSchema = z.object({
  orderId: z.string().min(1),
});

export const esewaVerifySchema = z.object({
  orderId: z.string().min(1),
  encodedResponse: z.string().min(1),
});

export const khaltiVerifySchema = z.object({
  orderId: z.string().min(1),
  pidx: z.string().min(1),
});

export const stripeConfirmSchema = z.object({
  orderId: z.string().min(1),
  paymentIntentId: z.string().min(1),
});

export const discountValidateSchema = z.object({
  code: z.string().trim().min(1),
  subtotal: z.number().optional(),
});

// ─── Try-On ──────────────────────────────────────────────────────────────────

export const createTryOnSchema = z.object({
  productId: z.string().min(1),
});

export const tryOnFeedbackSchema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
});

// ─── Public API ──────────────────────────────────────────────────────────────

export const publicTryOnSchema = z.object({
  productId: z.string().min(1),
  userPhotoUrl: z.string().url(),
});

export const sizeRecommendationSchema = z.object({
  productId: z.string().min(1),
  bust: z.number().optional(),
  waist: z.number().optional(),
  hips: z.number().optional(),
}).refine(d => d.bust || d.waist || d.hips, {
  message: "At least one measurement is required.",
});

// ─── Users ───────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const updateBodyProfileSchema = z.object({
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  bust: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  shoulders: z.number().positive().optional(),
  bodyType: z.enum(["HOURGLASS", "PEAR", "APPLE", "RECTANGLE", "INVERTED_TRIANGLE"]).optional(),
});

export const updateStyleProfileSchema = z.object({
  preferredStyles: z.array(z.string()).optional(),
  occasions: z.array(z.string()).optional(),
  colorPalette: z.array(z.string()).optional(),
});

export const notificationPrefsSchema = z.object({
  emailMarketing: z.boolean().optional(),
  emailOrders: z.boolean().optional(),
  emailTryOn: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE_MY_ACCOUNT"),
});

export const createAddressSchema = z.object({
  label: z.string().default("Home"),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  street: z.string().trim().min(1),
  city: z.string().trim().min(1),
  district: z.string().trim().min(1),
  province: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  street: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  district: z.string().trim().min(1).optional(),
  province: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const priceAlertSchema = z.object({
  productId: z.string().min(1),
  targetPrice: z.number().positive(),
});

export const followBrandSchema = z.object({
  brandId: z.string().min(1),
});

// ─── Brand ───────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default("NPR"),
  sizes: z.array(z.string()).min(1),
  category: z.string().min(1),
  garmentType: z.string().optional(),
  gender: z.string().optional(),
  images: z.array(z.string()).default([]),
  isTryonEnabled: z.boolean().default(false),
  suitableBodyTypes: z.array(z.string()).default([]),
});

export const bulkProductSchema = z.object({
  products: z.array(createProductSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1),
  trackingNumber: z.string().optional(),
});

export const replyReviewSchema = z.object({
  reply: z.string().trim().min(1),
});

export const updateInventorySchema = z.object({
  sizes: z.array(z.object({
    size: z.string().min(1),
    stock: z.number().int().min(0),
  })).min(1),
});

export const sizeChartSchema = z.object({
  sizes: z.array(z.object({
    size: z.string().min(1),
    bustMin: z.number().optional(),
    bustMax: z.number().optional(),
    waistMin: z.number().optional(),
    waistMax: z.number().optional(),
    hipsMin: z.number().optional(),
    hipsMax: z.number().optional(),
    sortOrder: z.number().int().default(0),
  })).min(1),
});

export const createBannerSchema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional(),
  placement: z.string().default("homepage"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminUpdateOrderSchema = z.object({
  status: z.string().min(1),
  trackingNumber: z.string().optional(),
});

export const adminVerifyBrandSchema = z.object({
  isVerified: z.boolean(),
});

export const adminUpdateReturnSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const adminUpdateBannerSchema = z.object({
  status: z.enum(["approved", "rejected", "active", "expired"]).optional(),
  adminNotes: z.string().optional(),
});

export const adminCreatePayoutSchema = z.object({
  brandId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("NPR"),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  reference: z.string().optional(),
});

// ─── Feedback ────────────────────────────────────────────────────────────────

export const feedbackSchema = z.object({
  type: z.enum(["nps", "bug", "feature", "general"]),
  score: z.number().int().min(0).max(10).optional(),
  comment: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine(d => d.type !== "nps" || (d.score !== undefined && d.score >= 0 && d.score <= 10), {
  message: "NPS feedback requires a score between 0 and 10.",
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});

// ─── Recommendations ────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1),
  conversationId: z.string().optional(),
});

// ─── Tenants ─────────────────────────────────────────────────────────────────

export const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
});

export const createApiKeySchema = z.object({
  label: z.string().default("API Key"),
  scopes: z.array(z.string()).default(["tryon:read", "tryon:write", "products:read"]),
});

export const webhookUrlSchema = z.object({
  url: z.string().url().startsWith("https://", { message: "Webhook URL must use HTTPS." }).nullable(),
});

export const subscribeTenantSchema = z.object({
  tier: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
});

// ─── Wardrobe ────────────────────────────────────────────────────────────────

export const addWardrobeSchema = z.object({
  productId: z.string().min(1),
  tryOnResultId: z.string().optional(),
  collectionId: z.string().optional(),
});

export const moveWardrobeSchema = z.object({
  collectionId: z.string().nullable(),
});

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1),
});

// ─── Wishlist ────────────────────────────────────────────────────────────────

export const addWishlistSchema = z.object({
  productId: z.string().min(1),
});
