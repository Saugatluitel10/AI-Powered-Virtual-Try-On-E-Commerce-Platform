import { prisma } from "../lib/prisma";
import { enqueueEmail } from "./queues";

export async function enqueueWeeklyDigests() {
  const users = await prisma.user.findMany({
    where: { emailMarketing: true },
    select: { id: true, email: true, name: true },
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { name: true, slug: true, images: true, price: true, currency: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (products.length === 0) return;

  for (const user of users) {
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 6).map((p) => ({
      name: p.name,
      slug: p.slug,
      imageUrl: p.images[0] ?? "",
      price: p.price,
      currency: p.currency,
    }));

    await enqueueEmail({
      type: "weekly_digest",
      to: user.email,
      payload: { userName: user.name ?? "", products: picks },
    });
  }
}
