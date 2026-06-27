import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { verifyJwt, type AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { cacheResponse } from "../middleware/cache";

const router: ReturnType<typeof Router> = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(
  bodyProfile: { height: number | null; bust: number | null; waist: number | null; hips: number | null; shoulders: number | null; bodyType: string | null },
  styleProfile: { preferredStyles: string[]; occasions: string[]; colorPalette: string[] } | null,
  productCatalog: string
): string {
  const measurements = [
    bodyProfile.height && `Height: ${bodyProfile.height}cm`,
    bodyProfile.bust && `Bust: ${bodyProfile.bust}cm`,
    bodyProfile.waist && `Waist: ${bodyProfile.waist}cm`,
    bodyProfile.hips && `Hips: ${bodyProfile.hips}cm`,
    bodyProfile.shoulders && `Shoulders: ${bodyProfile.shoulders}cm`,
  ]
    .filter(Boolean)
    .join(", ");

  const styleInfo = styleProfile
    ? `Their style preferences: ${styleProfile.preferredStyles.join(", ")}. They shop for: ${styleProfile.occasions.join(", ")}. Preferred colors: ${styleProfile.colorPalette.join(", ")}.`
    : "No style preferences recorded yet.";

  return `You are a warm, knowledgeable personal fashion stylist for a Nepali e-commerce platform called VTryon. You help users find clothes that flatter their body type and match their personal style.

The user has a ${bodyProfile.bodyType ?? "unknown"} body type with measurements: ${measurements || "not available"}.
${styleInfo}

Here is the current product catalog you can recommend from:
${productCatalog}

Guidelines:
- Always explain WHY a garment suits the user's body type (e.g. "A-line dresses balance wider hips by drawing attention to the waist")
- Recommend specific products using markdown links exactly as shown in the catalog (e.g. [Product Name](/shop/product-slug)) so users can click through
- If the user asks about festivals (Dashain, Tihar, etc.), suggest traditional Nepali garments
- Keep responses concise — 2-3 outfit suggestions max per message
- Be encouraging and body-positive
- If asked about sizing, mention that the platform has AI-powered size recommendations
- You can suggest complete looks (top + bottom + accessories)
- Use a friendly, conversational tone`;
}

// POST /api/v1/recommendations/chat
router.post("/chat", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const { message, conversationId } = req.body as {
      message?: string;
      conversationId?: string;
    };

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }

    const [bodyProfile, styleProfile, products] = await Promise.all([
      prisma.bodyProfile.findUnique({
        where: { userId: req.userId! },
        select: { height: true, bust: true, waist: true, hips: true, shoulders: true, bodyType: true },
      }),
      prisma.styleProfile.findUnique({
        where: { userId: req.userId! },
        select: { preferredStyles: true, occasions: true, colorPalette: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, slug: true, name: true, category: true, garmentType: true, gender: true, price: true, sizes: true, suitableBodyTypes: true, description: true },
        take: 50,
      }),
    ]);

    if (!bodyProfile) {
      return res.status(400).json({
        error: "Please complete your body profile first by uploading a photo.",
      });
    }

    const productCatalog = products
      .map(
        (p: typeof products[number]) =>
          `- [${p.name}](/shop/${p.slug}) (${p.category}, ${p.gender}, Rs. ${p.price}) — Sizes: ${p.sizes.join(",")} — Suits: ${p.suitableBodyTypes.join(",")}${p.description ? ` — ${p.description}` : ""}`
      )
      .join("\n");

    const systemPrompt = buildSystemPrompt(bodyProfile, styleProfile, productCatalog);

    // Load or create conversation
    let conversation: { id: string };
    let priorMessages: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: req.userId! },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 20 },
        },
      });
      if (existing) {
        conversation = existing;
        priorMessages = existing.messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }));
      } else {
        conversation = await prisma.conversation.create({
          data: { userId: req.userId!, title: message.slice(0, 100) },
        });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: { userId: req.userId!, title: message.slice(0, 100) },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Build message history for Claude
    const claudeMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...priorMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send conversation ID first
    res.write(`data: ${JSON.stringify({ type: "meta", conversationId: conversation.id })}\n\n`);

    let fullResponse = "";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: claudeMessages,
    });

    stream.on("text", (text) => {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    });

    stream.on("error", (error) => {
      console.error("[Claude stream error]", error);
      res.write(`data: ${JSON.stringify({ type: "error", error: "AI service error" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });

    stream.on("end", async () => {
      // Save assistant response
      if (fullResponse.length > 0) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: fullResponse,
          },
        });
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    });

    // Handle client disconnect
    req.on("close", () => {
      stream.abort();
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat error";
    if (!res.headersSent) {
      return res.status(500).json({ error: message });
    }
    res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
    res.end();
  }
});

// GET /api/v1/recommendations/conversations
router.get("/conversations", verifyJwt, cacheResponse(3600, "reco"), async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where: { userId: req.userId! } }),
      prisma.conversation.findMany({
        where: { userId: req.userId! },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);
    return res.json({
      data: {
        items: conversations,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching conversations";
    return res.status(500).json({ error: message });
  }
});

// GET /api/v1/recommendations/conversations/:id
router.get("/conversations/:id", verifyJwt, async (req: AuthRequest, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }
    return res.json({
      data: {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages.map((m: { id: string; role: string; content: string; createdAt: Date }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
        createdAt: conversation.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching conversation";
    return res.status(500).json({ error: message });
  }
});

// GET /api/v1/recommendations/for-me
router.get("/for-me", verifyJwt, cacheResponse(300, "reco"), async (req: AuthRequest, res) => {
  try {
    const [bodyProfile, styleProfile] = await Promise.all([
      prisma.bodyProfile.findUnique({
        where: { userId: req.userId! },
        select: { bodyType: true },
      }),
      prisma.styleProfile.findUnique({
        where: { userId: req.userId! },
        select: { preferredStyles: true, occasions: true },
      }),
    ]);

    const where: Record<string, unknown> = { isActive: true };
    if (bodyProfile?.bodyType) {
      where.suitableBodyTypes = { has: bodyProfile.bodyType };
    }

    const products = await prisma.product.findMany({
      where,
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
    const message = err instanceof Error ? err.message : "Error fetching recommendations";
    return res.status(500).json({ error: message });
  }
});

// GET /api/v1/recommendations/complete-the-look/:productId
router.get("/complete-the-look/:productId", verifyJwt, cacheResponse(600, "reco"), async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId as string },
      select: { garmentType: true, gender: true, category: true, id: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    const complementaryTypes: Record<string, string[]> = {
      tops: ["bottoms", "accessories", "outerwear"],
      bottoms: ["tops", "accessories", "outerwear"],
      dresses: ["accessories", "outerwear"],
      outerwear: ["tops", "bottoms", "accessories"],
      accessories: ["tops", "bottoms", "dresses"],
      sets: ["accessories"],
    };

    const types = complementaryTypes[product.garmentType ?? ""] ?? ["tops", "bottoms", "accessories"];

    const complements = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        garmentType: { in: types },
        gender: product.gender,
      },
      include: { brand: { select: { name: true } } },
      take: 8,
    });

    const items = complements.map((p: typeof complements[number]) => ({
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
    const message = err instanceof Error ? err.message : "Error fetching complementary items";
    return res.status(500).json({ error: message });
  }
});

export default router;
