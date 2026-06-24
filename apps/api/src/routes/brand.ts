import { Router } from "express";
import { verifyJwt, requireRole, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// All brand routes require BRAND role
router.use(verifyJwt, requireRole("BRAND"));

// ─── GET /api/v1/brand/dashboard ─────────────────────────────────────────────
router.get("/dashboard", async (req: AuthRequest, res) => {
  try {
    if (!req.brandId) {
      return res.status(400).json({ error: "No brand associated with your account." });
    }

    const [productCount, orderItems, topProducts] = await Promise.all([
      prisma.product.count({ where: { brandId: req.brandId } }),
      prisma.orderItem.findMany({
        where: { product: { brandId: req.brandId } },
        include: { order: { select: { status: true, currency: true, createdAt: true } } },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { product: { brandId: req.brandId } },
        _sum: { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
    ]);

    const completedOrders = orderItems.filter(
      (oi: typeof orderItems[number]) => !["cancelled", "refunded"].includes(oi.order.status)
    );
    let totalRevenue = 0;
    for (const oi of completedOrders) {
      totalRevenue += oi.priceAtTime * oi.quantity;
    }
    const totalOrders = new Set(completedOrders.map((oi: typeof completedOrders[number]) => oi.orderId)).size;

    const topProductIds = topProducts.map((tp: typeof topProducts[number]) => tp.productId);
    const topProductDetails = topProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, images: true, price: true, currency: true },
        })
      : [];

    type ProductInfo = { id: string; name: string; images: string[]; price: number; currency: string };
    const topProductMap = new Map<string, ProductInfo>(
      (topProductDetails as ProductInfo[]).map((p) => [p.id, p])
    );

    return res.json({
      data: {
        productCount,
        totalOrders,
        totalRevenue,
        currency: (completedOrders[0] as { order: { currency: string } } | undefined)?.order.currency ?? "NPR",
        topProducts: topProducts.map((tp: { productId: string; _sum: { quantity: number | null }; _count: number }) => {
          const product = topProductMap.get(tp.productId);
          return {
            productId: tp.productId,
            productName: product?.name ?? "Unknown",
            productImage: product?.images?.[0] ?? null,
            totalSold: tp._sum.quantity ?? 0,
            orderCount: tp._count,
          };
        }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching dashboard";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/brand/products ──────────────────────────────────────────────
router.get("/products", async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [total, products] = await Promise.all([
      prisma.product.count({ where: { brandId: req.brandId! } }),
      prisma.product.findMany({
        where: { brandId: req.brandId! },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      data: {
        items: products.map((p: typeof products[number]) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          currency: p.currency,
          sizes: p.sizes,
          category: p.category,
          images: p.images,
          isActive: p.isActive,
          isTryonEnabled: p.isTryonEnabled,
          createdAt: p.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching products";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/brand/products ─────────────────────────────────────────────
router.post("/products", async (req: AuthRequest, res) => {
  try {
    const { name, description, price, currency, sizes, category, garmentType, gender, images, isTryonEnabled, suitableBodyTypes } = req.body as {
      name: string;
      description?: string;
      price: number;
      currency?: string;
      sizes: string[];
      category: string;
      garmentType?: string;
      gender?: string;
      images: string[];
      isTryonEnabled?: boolean;
      suitableBodyTypes?: string[];
    };

    if (!name || !price || !sizes?.length || !category) {
      return res.status(400).json({ error: "name, price, sizes, and category are required." });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description ?? null,
        brandId: req.brandId!,
        price,
        currency: currency ?? "NPR",
        sizes,
        category,
        garmentType: garmentType ?? null,
        gender: gender ?? null,
        images: images ?? [],
        isTryonEnabled: isTryonEnabled ?? false,
        suitableBodyTypes: suitableBodyTypes ?? [],
      },
    });

    return res.status(201).json({ data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating product";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/brand/products/bulk ────────────────────────────────────────
// Accepts an array of product objects for CSV-parsed bulk upload
router.post("/products/bulk", async (req: AuthRequest, res) => {
  try {
    const { products } = req.body as {
      products: Array<{
        name: string;
        description?: string;
        price: number;
        currency?: string;
        sizes: string[];
        category: string;
        garmentType?: string;
        gender?: string;
        images?: string[];
        isTryonEnabled?: boolean;
      }>;
    };

    if (!products?.length) {
      return res.status(400).json({ error: "products array is required." });
    }

    const created = await prisma.product.createMany({
      data: products.map((p, idx) => ({
        name: p.name,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36) + idx,
        description: p.description ?? null,
        brandId: req.brandId!,
        price: p.price,
        currency: p.currency ?? "NPR",
        sizes: p.sizes ?? [],
        category: p.category,
        garmentType: p.garmentType ?? null,
        gender: p.gender ?? null,
        images: p.images ?? [],
        isTryonEnabled: p.isTryonEnabled ?? false,
        suitableBodyTypes: [],
      })),
    });

    return res.status(201).json({ data: { count: created.count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error bulk creating products";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/v1/brand/products/:id ────────────────────────────────────────
router.patch("/products/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id as string, brandId: req.brandId! },
    });
    if (!existing) {
      return res.status(404).json({ error: "Product not found." });
    }

    const { name, description, price, sizes, category, garmentType, gender, images, isTryonEnabled, isActive, suitableBodyTypes } = req.body;

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(sizes !== undefined && { sizes }),
        ...(category !== undefined && { category }),
        ...(garmentType !== undefined && { garmentType }),
        ...(gender !== undefined && { gender }),
        ...(images !== undefined && { images }),
        ...(isTryonEnabled !== undefined && { isTryonEnabled }),
        ...(isActive !== undefined && { isActive }),
        ...(suitableBodyTypes !== undefined && { suitableBodyTypes }),
      },
    });

    return res.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error updating product";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/brand/sales ─────────────────────────────────────────────────
router.get("/sales", async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const where = { product: { brandId: req.brandId! } };

    const [total, items] = await Promise.all([
      prisma.orderItem.count({ where }),
      prisma.orderItem.findMany({
        where,
        include: {
          product: { select: { name: true, images: true } },
          order: { select: { id: true, status: true, createdAt: true, currency: true, user: { select: { email: true, name: true } } } },
        },
        orderBy: { order: { createdAt: "desc" } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      data: {
        items: items.map((oi: typeof items[number]) => ({
          orderItemId: oi.id,
          orderId: oi.order.id,
          orderStatus: oi.order.status,
          productName: oi.product.name,
          productImage: oi.product.images[0] ?? null,
          size: oi.size,
          quantity: oi.quantity,
          priceAtTime: oi.priceAtTime,
          lineTotal: oi.priceAtTime * oi.quantity,
          currency: oi.order.currency,
          customerName: oi.order.user.name ?? oi.order.user.email,
          orderedAt: oi.order.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching sales";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/brand/commission ────────────────────────────────────────────
router.get("/commission", async (req: AuthRequest, res) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.brandId! },
      select: { commissionRate: true, name: true },
    });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found." });
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: { brandId: req.brandId! },
        order: { status: { notIn: ["cancelled", "refunded"] } },
      },
      include: { order: { select: { currency: true, createdAt: true } } },
    });

    let totalRevenue = 0;
    for (const oi of orderItems) {
      totalRevenue += oi.priceAtTime * oi.quantity;
    }
    const commissionAmount = totalRevenue * brand.commissionRate;
    const payoutAmount = totalRevenue - commissionAmount;

    // Group by month
    const monthlyBreakdown: Record<string, { revenue: number; commission: number; payout: number }> = {};
    for (const oi of orderItems) {
      const monthKey = oi.order.createdAt.toISOString().slice(0, 7);
      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = { revenue: 0, commission: 0, payout: 0 };
      }
      const lineTotal = oi.priceAtTime * oi.quantity;
      monthlyBreakdown[monthKey].revenue += lineTotal;
      monthlyBreakdown[monthKey].commission += lineTotal * brand.commissionRate;
      monthlyBreakdown[monthKey].payout += lineTotal * (1 - brand.commissionRate);
    }

    return res.json({
      data: {
        brandName: brand.name,
        commissionRate: brand.commissionRate,
        totalRevenue,
        commissionAmount,
        payoutAmount,
        currency: orderItems[0]?.order.currency ?? "NPR",
        monthlyBreakdown: Object.entries(monthlyBreakdown)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, data]) => ({ month, ...data })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching commission";
    return res.status(500).json({ error: message });
  }
});

export default router;
