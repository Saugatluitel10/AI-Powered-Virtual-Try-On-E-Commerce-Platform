import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Brand ────────────────────────────────────────────────────────────────
  const brand = await prisma.brand.upsert({
    where: { id: "brand_himalayan" },
    update: {},
    create: {
      id: "brand_himalayan",
      name: "Himalayan Threads",
      logo: "https://res.cloudinary.com/demo/image/upload/himalayan-threads-logo.png",
      commissionRate: 0.12,
      isVerified: true,
    },
  });
  console.log(`Brand: ${brand.name}`);

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "classic-kurta-white" },
      update: {},
      create: {
        id: "prod_kurta_white",
        name: "Classic White Kurta",
        slug: "classic-kurta-white",
        brandId: brand.id,
        price: 1499,
        currency: "NPR",
        sizes: ["XS", "S", "M", "L", "XL"],
        category: "tops",
        images: [
          "https://res.cloudinary.com/demo/image/upload/kurta-white-front.jpg",
          "https://res.cloudinary.com/demo/image/upload/kurta-white-back.jpg",
        ],
        description: "A timeless white cotton kurta, perfect for everyday wear.",
      },
    }),
    prisma.product.upsert({
      where: { slug: "floral-salwar-blue" },
      update: {},
      create: {
        id: "prod_salwar_blue",
        name: "Floral Blue Salwar Suit",
        slug: "floral-salwar-blue",
        brandId: brand.id,
        price: 2799,
        currency: "NPR",
        sizes: ["S", "M", "L", "XL"],
        category: "sets",
        images: [
          "https://res.cloudinary.com/demo/image/upload/salwar-blue-front.jpg",
        ],
        description: "Elegant floral print salwar suit in calming blue tones.",
      },
    }),
    prisma.product.upsert({
      where: { slug: "slim-fit-chinos-beige" },
      update: {},
      create: {
        id: "prod_chinos_beige",
        name: "Slim Fit Beige Chinos",
        slug: "slim-fit-chinos-beige",
        brandId: brand.id,
        price: 1999,
        currency: "NPR",
        sizes: ["28", "30", "32", "34", "36"],
        category: "bottoms",
        images: [
          "https://res.cloudinary.com/demo/image/upload/chinos-beige.jpg",
        ],
        description: "Versatile slim fit chinos in a neutral beige.",
      },
    }),
    prisma.product.upsert({
      where: { slug: "embroidered-dupatta-red" },
      update: {},
      create: {
        id: "prod_dupatta_red",
        name: "Embroidered Red Dupatta",
        slug: "embroidered-dupatta-red",
        brandId: brand.id,
        price: 799,
        currency: "NPR",
        sizes: ["ONE_SIZE"],
        category: "accessories",
        images: [
          "https://res.cloudinary.com/demo/image/upload/dupatta-red.jpg",
        ],
        description: "Hand-embroidered dupatta with traditional Nepali motifs.",
      },
    }),
    prisma.product.upsert({
      where: { slug: "linen-shirt-navy" },
      update: {},
      create: {
        id: "prod_shirt_navy",
        name: "Linen Navy Shirt",
        slug: "linen-shirt-navy",
        brandId: brand.id,
        price: 1699,
        currency: "NPR",
        sizes: ["S", "M", "L", "XL", "XXL"],
        category: "tops",
        images: [
          "https://res.cloudinary.com/demo/image/upload/linen-shirt-navy.jpg",
        ],
        description: "Breathable linen shirt in classic navy, ideal for warm days.",
      },
    }),
  ]);
  console.log(`Products: ${products.map((p) => p.name).join(", ")}`);

  // ─── Test user ────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "test@vtryon.com" },
    update: {},
    create: {
      id: "user_test_001",
      email: "test@vtryon.com",
      name: "Test User",
      supabaseId: "supabase_test_001",
      bodyProfile: {
        create: {
          height: 165,
          weight: 60,
          bust: 86,
          waist: 68,
          hips: 92,
          shoulders: 38,
          bodyType: "HOURGLASS",
        },
      },
      styleProfile: {
        create: {
          preferredStyles: ["casual", "traditional", "smart-casual"],
          occasions: ["daily", "festivals", "office"],
          colorPalette: ["navy", "white", "maroon", "beige"],
        },
      },
    },
  });
  console.log(`User: ${user.email}`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
