import { prisma } from '@/lib/prisma';

/**
 * Helper to create WFH quota rewards
 * You can call this manually to create rewards or use it as a reference
 */
export async function createWFHRewards() {
  const wfhRewards = [
    {
      name: 'WFH Day +1',
      description: 'Redeem for 1 additional WFH day this month',
      pointsCost: 50,
      quantity: -1, // unlimited
      isActive: true,
    },
    {
      name: 'WFH Week +5',
      description: 'Redeem for 5 additional WFH days this month',
      pointsCost: 200,
      quantity: -1, // unlimited
      isActive: true,
    },
  ];

  for (const reward of wfhRewards) {
    try {
      const existing = await prisma.reward.findFirst({
        where: { name: reward.name },
      });

      if (!existing) {
        const created = await prisma.reward.create({
          data: reward,
        });
        console.log(`✓ Created reward: ${created.name}`);
      } else {
        console.log(`✓ Reward already exists: ${reward.name}`);
      }
    } catch (error) {
      console.error(`✗ Failed to create reward ${reward.name}:`, error);
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createWFHRewards().catch(console.error);
}
