import { Router, type Request } from "express";
import { prisma } from "../lib/prisma";
import { cacheResponse } from "../middleware/cache";

const router: ReturnType<typeof Router> = Router();

// ─── GET /api/v1/products ─────────────────────────────────────────────────────
// Query params: q, category, garmentType, gender, minPrice, maxPrice,
//               size, bodyType, isTryonEnabled, sort, page, pageSize
router.get("/", cacheResponse(300, "products"), async (req: Request, res) => {
  try {
    const {
      q,
      category,
      garmentType,
      gender,
      minPrice,
      maxPrice,
      size,
      bodyType,
      brand,
      isTryonEnabled,
      sort = "newest",
      page = "1",
      pageSize = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    // ── Full-text search via tsvector ─────────────────────────────────────
    let searchIds: string[] | undefined;
    const queryStr = typeof q === "string" ? q.trim() : "";
    if (queryStr.length > 0) {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Product"
        WHERE "isActive" = true
          AND to_tsvector('english',
            COALESCE(name, '') || ' ' || COALESCE(description, '')
          ) @@ plainto_tsquery('english', ${queryStr})
      `;
      if (rows.length === 0) {
        return res.json({
          data: { items: [], total: 0, page: pageNum, pageSize: pageSizeNum, totalPages: 0 },
        });
      }
      searchIds = rows.map((r: { id: string }) => r.id);
    }

    // ── Build Prisma where clause ─────────────────────────────────────────
    const where: Record<string, unknown> = { isActive: true };

    if (searchIds) where.id = { in: searchIds };
    if (category) where.category = category;
    if (garmentType) where.garmentType = garmentType;
    if (gender) where.gender = gender;
    if (size) where.sizes = { has: size };
    if (bodyType) where.suitableBodyTypes = { has: bodyType.toUpperCase() };
    if (brand) where.brand = { name: { contains: brand, mode: "insensitive" } };
    if (isTryonEnabled === "true") where.isTryonEnabled = true;

    const priceFilter: Record<string, number> = {};
    if (minPrice) priceFilter.gte = parseFloat(minPrice);
    if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
    if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) {
      where.price = priceFilter;
    }

    // ── Order ─────────────────────────────────────────────────────────────
    const orderBy =
      sort === "price_asc"
        ? { price: "asc" as const }
        : sort === "price_desc"
        ? { price: "desc" as const }
        : { createdAt: "desc" as const };

    // ── Execute ───────────────────────────────────────────────────────────
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { brand: { select: { name: true } } },
        orderBy,
        skip,
        take: pageSizeNum,
      }),
    ]);

    const items = products.map((p: typeof products[number]) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      currency: p.currency,
      sizes: p.sizes,
      gender: p.gender,
      garmentType: p.garmentType,
      isTryonEnabled: p.isTryonEnabled,
      suitableBodyTypes: p.suitableBodyTypes,
      primaryImageUrl: p.images[0] ?? null,
      brandName: p.brand?.name ?? null,
    }));

    return res.json({
      data: {
        items,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching products";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/:id ─────────────────────────────────────────────────
router.get("/:id", cacheResponse(300, "products"), async (req: Request, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: req.params.id as string }, { slug: req.params.id as string }],
        isActive: true,
      },
      include: { brand: { select: { id: true, name: true, logo: true } } },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json({
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        currency: product.currency,
        sizes: product.sizes,
        gender: product.gender,
        garmentType: product.garmentType,
        isTryonEnabled: product.isTryonEnabled,
        suitableBodyTypes: product.suitableBodyTypes,
        images: product.images,
        primaryImageUrl: product.images[0] ?? null,
        brandId: product.brandId,
        brandName: product.brand?.name ?? null,
        brandLogo: product.brand?.logo ?? null,
        createdAt: product.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching product";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/:id/size-recommendation ─────────────────────────────
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { recommendSize } from "../lib/sizeRecommender";

router.get("/:id/size-recommendation", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const recommendation = await recommendSize(req.userId!, req.params.id as string);
    if (!recommendation) {
      return res.status(404).json({
        error: "Unable to generate size recommendation. Please complete your body profile first.",
      });
    }
    return res.json({ data: recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generating size recommendation";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/search/autocomplete ───────────────────────────────
router.get("/search/autocomplete", async (req: Request, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (q.length < 2) return res.json({ data: [] });

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true, primaryImageUrl: true },
      take: 8,
    });

    return res.json({
      data: products.map((p: typeof products[number]) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Autocomplete error";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/new-arrivals ──────────────────────────────────────
router.get("/new-arrivals", cacheResponse(600, "products"), async (_req: Request, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { brand: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    const items = products.map((p: typeof products[number]) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      currency: p.currency,
      sizes: p.sizes,
      gender: p.gender,
      garmentType: p.garmentType,
      isTryonEnabled: p.isTryonEnabled,
      suitableBodyTypes: p.suitableBodyTypes,
      primaryImageUrl: p.images[0] ?? null,
      brandName: p.brand?.name ?? null,
    }));

    return res.json({ data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching new arrivals";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/trending ──────────────────────────────────────────
router.get("/trending", cacheResponse(600, "products"), async (_req: Request, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topOrderItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { createdAt: { gte: thirtyDaysAgo }, status: { notIn: ["cancelled", "refunded"] } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 12,
    });

    const productIds = topOrderItems.map((item: typeof topOrderItems[number]) => item.productId);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { brand: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p: typeof products[number]) => [p.id, p]));
    const items = productIds
      .map((id: string) => productMap.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        slug: p!.slug,
        price: p!.price,
        currency: p!.currency,
        sizes: p!.sizes,
        gender: p!.gender,
        garmentType: p!.garmentType,
        isTryonEnabled: p!.isTryonEnabled,
        suitableBodyTypes: p!.suitableBodyTypes,
        primaryImageUrl: p!.images[0] ?? null,
        brandName: p!.brand?.name ?? null,
      }));

    return res.json({ data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching trending products";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/:id/related ───────────────────────────────────────
router.get("/:id/related", cacheResponse(600, "products"), async (req: Request, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: req.params.id as string }, { slug: req.params.id as string }], isActive: true },
      select: { id: true, category: true, gender: true, garmentType: true, brandId: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    const related = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        OR: [
          { category: product.category },
          { garmentType: product.garmentType },
          { brandId: product.brandId },
        ],
      },
      include: { brand: { select: { name: true } } },
      take: 8,
    });

    const items = related.map((p: typeof related[number]) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      currency: p.currency,
      sizes: p.sizes,
      gender: p.gender,
      garmentType: p.garmentType,
      isTryonEnabled: p.isTryonEnabled,
      suitableBodyTypes: p.suitableBodyTypes,
      primaryImageUrl: p.images[0] ?? null,
      brandName: p.brand?.name ?? null,
    }));

    return res.json({ data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching related products";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/:id/size-chart ────────────────────────────────────
router.get("/:id/size-chart", cacheResponse(3600, "products"), async (req: Request, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: req.params.id as string }, { slug: req.params.id as string }], isActive: true },
      select: { brandId: true, sizes: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    const chart = await prisma.sizeChart.findMany({
      where: { brandId: product.brandId },
      orderBy: { sortOrder: "asc" },
      select: {
        size: true,
        bustMin: true, bustMax: true,
        waistMin: true, waistMax: true,
        hipsMin: true, hipsMax: true,
      },
    });

    return res.json({ data: { sizes: product.sizes, chart } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching size chart";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/v1/products/:id/size-comparison ───────────────────────────────
router.get("/:id/size-comparison", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: req.params.id as string }, { slug: req.params.id as string }], isActive: true },
      select: { category: true, garmentType: true, gender: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    const profile = await prisma.bodyProfile.findUnique({
      where: { userId: req.userId! },
      select: { bust: true, waist: true, hips: true },
    });

    if (!profile) {
      return res.status(400).json({ error: "Body profile required for size comparison." });
    }

    const similarProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        category: product.category,
        gender: product.gender,
      },
      include: {
        brand: { select: { id: true, name: true } },
      },
      take: 10,
    });

    const comparisons = await Promise.all(
      similarProducts.map(async (p: typeof similarProducts[number]) => {
        const rec = await recommendSize(req.userId!, p.id);
        return rec ? {
          productId: p.id,
          productName: p.name,
          brandName: p.brand?.name ?? null,
          recommendedSize: rec.recommendedSize,
          confidence: rec.confidence,
        } : null;
      })
    );

    return res.json({ data: comparisons.filter(Boolean) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generating size comparison";
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/v1/products (retailer_admin only — placeholder) ────────────────

router.post("/", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "POST /products" });
});

router.patch("/:id", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "PATCH /products/:id" });
});

router.delete("/:id", verifyJwt, (_req, res) => {
  res.json({ ok: true, route: "DELETE /products/:id" });
});

// ─── GET /api/v1/products/banners/active — active sponsored banners ────────
router.get("/banners/active", cacheResponse(300, "banners"), async (_req, res) => {
  try {
    const now = new Date();
    const banners = await prisma.promoBanner.findMany({
      where: {
        status: "active",
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        placement: true,
        brand: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return res.json({ data: banners });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching banners";
    return res.status(500).json({ error: message });
  }
});

export default router;
