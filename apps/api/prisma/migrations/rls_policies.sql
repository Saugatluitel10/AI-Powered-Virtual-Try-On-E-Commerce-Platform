-- Supabase Row Level Security (RLS) policies
-- Run this in the Supabase SQL editor to enable RLS on all tables.
-- Prisma manages schema; these policies add an extra DB-level security layer.

-- Enable RLS on all user-facing tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BodyProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StyleProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TryOnResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WardrobeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WardrobeCollection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;

-- Products and brands are publicly readable
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;

-- Service role (used by the API backend) bypasses RLS
-- These policies ensure that even with a leaked Supabase anon key,
-- direct DB access from the client cannot read other users' data.

-- User: can only read/update own record
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid()::text = "supabaseId");

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid()::text = "supabaseId");

-- BodyProfile: scoped to user
CREATE POLICY "Own body profile" ON "BodyProfile"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- StyleProfile: scoped to user
CREATE POLICY "Own style profile" ON "StyleProfile"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- CartItem: scoped to user
CREATE POLICY "Own cart items" ON "CartItem"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- Order: scoped to user
CREATE POLICY "Own orders" ON "Order"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- OrderItem: through order ownership
CREATE POLICY "Own order items" ON "OrderItem"
  FOR SELECT USING ("orderId" IN (SELECT id FROM "Order" WHERE "userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)));

-- TryOnResult: scoped to user
CREATE POLICY "Own try-on results" ON "TryOnResult"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- WardrobeItem: scoped to user
CREATE POLICY "Own wardrobe items" ON "WardrobeItem"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- WardrobeCollection: scoped to user (public collections readable via shareToken)
CREATE POLICY "Own wardrobe collections" ON "WardrobeCollection"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

CREATE POLICY "Public collections viewable" ON "WardrobeCollection"
  FOR SELECT USING ("isPublic" = true);

-- Conversation & Message: scoped to user
CREATE POLICY "Own conversations" ON "Conversation"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

CREATE POLICY "Own messages" ON "Message"
  FOR ALL USING ("conversationId" IN (SELECT id FROM "Conversation" WHERE "userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text)));

-- ReturnRequest: scoped to user
CREATE POLICY "Own return requests" ON "ReturnRequest"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- Wishlist: scoped to user
CREATE POLICY "Own wishlist" ON "Wishlist"
  FOR ALL USING ("userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text));

-- Product: publicly readable, only admins/brands can write (handled by API middleware)
CREATE POLICY "Products are publicly readable" ON "Product"
  FOR SELECT USING (true);

-- Brand: publicly readable
CREATE POLICY "Brands are publicly readable" ON "Brand"
  FOR SELECT USING (true);

-- Category: publicly readable
CREATE POLICY "Categories are publicly readable" ON "Category"
  FOR SELECT USING (true);
