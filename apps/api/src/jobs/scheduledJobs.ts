import { prisma } from "../lib/prisma";
import { supabase, BUCKETS } from "../lib/supabase";
import { enqueueEmail } from "./queues";

export async function cleanupExpiredPhotos() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const expiredProfiles = await prisma.bodyProfile.findMany({
    where: {
      photoUrl: { not: null },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, userId: true, photoUrl: true },
  });

  for (const profile of expiredProfiles) {
    if (!profile.photoUrl) continue;

    try {
      await supabase.storage
        .from(BUCKETS.USER_PHOTOS)
        .remove([profile.photoUrl]);

      await prisma.bodyProfile.update({
        where: { id: profile.id },
        data: { photoUrl: null },
      });
    } catch (err) {
      console.error(`[PhotoCleanup] Failed to delete photo for user ${profile.userId}:`, err);
    }
  }

  if (expiredProfiles.length > 0) {
    console.log(`[PhotoCleanup] Deleted ${expiredProfiles.length} expired user photos.`);
  }
}

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
