import { Router, type Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── GET /api/v1/products ─────────────────────────────────────────────────────
// Query params: q, category, garmentType, gender, minPrice, maxPrice,
//               size, bodyType, isTryonEnabled, sort, page, pageSize
router.get("/", async (req: Request, res) => {
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
      searchIds = rows.map((r) => r.id);
    }

    // ── Build Prisma where clause ─────────────────────────────────────────
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (searchIds) where.id = { in: searchIds };
    if (category) where.category = category;
    if (garmentType) where.garmentType = garmentType;
    if (gender) where.gender = gender;
    if (size) where.sizes = { has: size };
    if (bodyType) where.suitableBodyTypes = { has: bodyType.toUpperCase() };
    if (isTryonEnabled === "true") where.isTryonEnabled = true;

    const priceFilter: Prisma.FloatFilter = {};
    if (minPrice) priceFilter.gte = parseFloat(minPrice);
    if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
    if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) {
      where.price = priceFilter;
    }

    // ── Order ─────────────────────────────────────────────────────────────
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc"
        ? { price: "asc" }
        : sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

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

    const items = products.map((p) => ({
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
router.get("/:id", async (req: Request, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: req.params.id }, { slug: req.params.id }],
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
    const recommendation = await recommendSize(req.userId!, req.params.id);
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

export default router;
