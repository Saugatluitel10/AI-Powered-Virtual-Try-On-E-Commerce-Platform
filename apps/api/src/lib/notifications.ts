import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type NotificationType =
  | "order_status"
  | "payment"
  | "price_drop"
  | "style_recommendation"
  | "brand_verified"
  | "review_reply"
  | "return_update"
  | "try_on_complete"
  | "payout";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function createNotificationsForBrandMembers(
  brandId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const members = await prisma.user.findMany({
    where: { brandId },
    select: { id: true },
  });
  if (members.length === 0) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      type,
      title,
      body,
      data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}
