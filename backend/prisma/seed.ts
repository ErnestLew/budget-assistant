import { PrismaClient } from '@prisma/client';

const DEFAULT_CATEGORIES = [
  { name: 'Supermarket', icon: 'shopping-cart', color: '#22C55E' },
  { name: 'Food & Beverage', icon: 'utensils', color: '#F97316' },
  { name: 'Food Delivery', icon: 'bike', color: '#EF4444' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#3B82F6' },
  { name: 'Shopee', icon: 'package', color: '#EC4899' },
  { name: 'Transport', icon: 'car', color: '#8B5CF6' },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#F59E0B' },
  { name: 'Subscriptions', icon: 'repeat', color: '#6366F1' },
  { name: 'Entertainment', icon: 'film', color: '#14B8A6' },
  { name: 'Health', icon: 'heart', color: '#10B981' },
  { name: 'Education', icon: 'book', color: '#06B6D4' },
  { name: 'Travel', icon: 'plane', color: '#0EA5E9' },
  { name: 'Other', icon: 'more-horizontal', color: '#6B7280' },
];

async function main() {
  const prisma = new PrismaClient();

  // Check if defaults already exist
  const existing = await prisma.category.findFirst({
    where: { isDefault: true },
  });

  if (!existing) {
    console.log('Seeding default categories...');
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        isDefault: true,
      })),
    });
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
  } else {
    console.log('Default categories already exist, skipping seed');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
