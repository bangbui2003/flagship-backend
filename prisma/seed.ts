/**
 * Comprehensive seed script for Flagship.
 * Run: npx tsx prisma/seed.ts
 *
 * Creates realistic demo data covering all major use cases:
 * - 2 projects (E-commerce Platform, Mobile App)
 * - 3 environments each (Development, Staging, Production)
 * - 8 feature flags with variations, targeting rules
 * - Segments with users
 * - Events (analytics data)
 * - Audit logs
 * - Webhooks
 * - Schedules
 */

import { config } from "dotenv";
import { resolve } from "path";
// Load from flagship root .env (where DATABASE_URL lives)
config({ path: resolve(process.cwd(), "../.env") });
config({ path: resolve(process.cwd(), ".env") }); // fallback to local .env

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

function generateApiKey(): string {
  return `fls_${crypto.randomUUID()}`;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding Flagship database...\n");

  // ─── 1. Users ───────────────────────────────────────────────────────────────
  console.log("Creating users...");
  const adminUser = await db.userAccount.upsert({
    where: { email: "admin@flagship.dev" },
    update: {},
    create: {
      email: "admin@flagship.dev",
      name: "Admin User",
      role: "admin",
      passwordHash: hashPassword("password123"),
      isActive: true,
    },
  });

  const devUser = await db.userAccount.upsert({
    where: { email: "developer@flagship.dev" },
    update: {},
    create: {
      email: "developer@flagship.dev",
      name: "Alice Developer",
      role: "developer",
      passwordHash: hashPassword("password123"),
      isActive: true,
    },
  });

  const pmUser = await db.userAccount.upsert({
    where: { email: "pm@flagship.dev" },
    update: {},
    create: {
      email: "pm@flagship.dev",
      name: "Bob Product Manager",
      role: "product_manager",
      passwordHash: hashPassword("password123"),
      isActive: true,
    },
  });

  const qaUser = await db.userAccount.upsert({
    where: { email: "qa@flagship.dev" },
    update: {},
    create: {
      email: "qa@flagship.dev",
      name: "Carol QA Engineer",
      role: "qa",
      passwordHash: hashPassword("password123"),
      isActive: true,
    },
  });

  const viewerUser = await db.userAccount.upsert({
    where: { email: "viewer@flagship.dev" },
    update: {},
    create: {
      email: "viewer@flagship.dev",
      name: "Dave Viewer",
      role: "viewer",
      passwordHash: hashPassword("password123"),
      isActive: true,
    },
  });

  console.log(`  ✓ ${[adminUser, devUser, pmUser, qaUser, viewerUser].length} users`);

  // ─── 2. Projects ────────────────────────────────────────────────────────────
  console.log("Creating projects...");
  const ecommerceProject = await db.project.upsert({
    where: { name: "E-commerce Platform" },
    update: {},
    create: {
      name: "E-commerce Platform",
      description: "Main e-commerce site with checkout, product listings, and user accounts",
    },
  });

  const mobileProject = await db.project.upsert({
    where: { name: "Mobile App" },
    update: {},
    create: {
      name: "Mobile App",
      description: "iOS and Android mobile application for customer-facing features",
    },
  });

  console.log(`  ✓ 2 projects`);

  // ─── 3. Environments ────────────────────────────────────────────────────────
  console.log("Creating environments...");

  const createEnvIfNotExists = async (
    projectId: string,
    key: string,
    name: string,
    color: string
  ) => {
    const existing = await db.environment.findFirst({ where: { projectId, key } });
    if (existing) return existing;
    return db.environment.create({
      data: { projectId, key, name, color, apiKey: generateApiKey() },
    });
  };

  const [ecDev, ecStaging, ecProd] = await Promise.all([
    createEnvIfNotExists(ecommerceProject.id, "development", "Development", "#22c55e"),
    createEnvIfNotExists(ecommerceProject.id, "staging", "Staging", "#f59e0b"),
    createEnvIfNotExists(ecommerceProject.id, "production", "Production", "#ef4444"),
  ]);

  const [mobDev, mobStaging, mobProd] = await Promise.all([
    createEnvIfNotExists(mobileProject.id, "development", "Development", "#22c55e"),
    createEnvIfNotExists(mobileProject.id, "staging", "Staging", "#f59e0b"),
    createEnvIfNotExists(mobileProject.id, "production", "Production", "#ef4444"),
  ]);

  console.log(`  ✓ 6 environments (dev/staging/prod × 2 projects)`);

  // ─── 4. Flags for E-commerce ────────────────────────────────────────────────
  console.log("Creating flags for E-commerce Platform...");

  const createFlagIfNotExists = async (
    projectId: string,
    key: string,
    name: string,
    description: string
  ) => {
    const existing = await db.flag.findFirst({ where: { projectId, key } });
    if (existing) return existing;
    return db.flag.create({ data: { projectId, key, name, description } });
  };

  // Flag 1: New Checkout Flow
  const checkoutFlag = await createFlagIfNotExists(
    ecommerceProject.id,
    "new-checkout-flow",
    "New Checkout Flow",
    "Redesigned checkout with fewer steps and Apple/Google Pay support"
  );

  // Flag 2: Product Recommendations
  const recommendationsFlag = await createFlagIfNotExists(
    ecommerceProject.id,
    "product-recommendations",
    "Product Recommendations",
    "AI-powered product recommendations on PDP and cart pages"
  );

  // Flag 3: Dark Mode
  const darkModeFlag = await createFlagIfNotExists(
    ecommerceProject.id,
    "dark-mode",
    "Dark Mode",
    "Dark mode UI theme toggle"
  );

  // Flag 4: Free Shipping Banner
  const freeShippingFlag = await createFlagIfNotExists(
    ecommerceProject.id,
    "free-shipping-banner",
    "Free Shipping Banner",
    "Display free shipping promotion banner with threshold amount"
  );

  // Flag 5: Discount Rate (string flag)
  const discountRateFlag = await createFlagIfNotExists(
    ecommerceProject.id,
    "discount-rate",
    "Discount Rate",
    "Promotional discount rate shown in cart — controls which cohort sees which percentage"
  );

  console.log(`  ✓ 5 flags for E-commerce Platform`);

  // ─── 5. Flags for Mobile App ────────────────────────────────────────────────
  console.log("Creating flags for Mobile App...");

  const onboardingFlag = await createFlagIfNotExists(
    mobileProject.id,
    "new-onboarding",
    "New Onboarding Flow",
    "Revamped onboarding with interactive tutorial and skip option"
  );

  const pushNotifFlag = await createFlagIfNotExists(
    mobileProject.id,
    "push-notifications-v2",
    "Push Notifications V2",
    "Redesigned push notification system with rich media support"
  );

  const offlineModeFlag = await createFlagIfNotExists(
    mobileProject.id,
    "offline-mode",
    "Offline Mode",
    "Full offline support with local data caching"
  );

  console.log(`  ✓ 3 flags for Mobile App`);

  // ─── 6. Variations ──────────────────────────────────────────────────────────
  console.log("Creating variations...");

  const createVariationIfNotExists = async (
    flagId: string,
    key: string,
    value: unknown
  ) => {
    const existing = await db.flagVariation.findFirst({ where: { flagId, key } });
    if (existing) return existing;
    return db.flagVariation.create({ data: { flagId, key, value: value as never } });
  };

  // checkout variations
  const checkoutControl = await createVariationIfNotExists(checkoutFlag.id, "control", false);
  const checkoutTreatment = await createVariationIfNotExists(checkoutFlag.id, "new-flow", true);

  // recommendations variations
  const recOff = await createVariationIfNotExists(recommendationsFlag.id, "off", false);
  const recCollabFilter = await createVariationIfNotExists(recommendationsFlag.id, "collaborative-filter", "collaborative");
  const recContentBased = await createVariationIfNotExists(recommendationsFlag.id, "content-based", "content");

  // dark mode variations
  const lightMode = await createVariationIfNotExists(darkModeFlag.id, "light", "light");
  const darkMode = await createVariationIfNotExists(darkModeFlag.id, "dark", "dark");
  const systemMode = await createVariationIfNotExists(darkModeFlag.id, "system", "system");

  // free shipping variations
  const noShippingBanner = await createVariationIfNotExists(freeShippingFlag.id, "hidden", false);
  const shippingThreshold50 = await createVariationIfNotExists(freeShippingFlag.id, "threshold-50", 50);
  const shippingThreshold75 = await createVariationIfNotExists(freeShippingFlag.id, "threshold-75", 75);

  // discount rate variations
  const discount0 = await createVariationIfNotExists(discountRateFlag.id, "no-discount", "0%");
  const discount10 = await createVariationIfNotExists(discountRateFlag.id, "10-percent", "10%");
  const discount20 = await createVariationIfNotExists(discountRateFlag.id, "20-percent", "20%");

  // mobile onboarding variations
  const oldOnboarding = await createVariationIfNotExists(onboardingFlag.id, "current", false);
  const newOnboarding = await createVariationIfNotExists(onboardingFlag.id, "new-flow", true);
  const skippableOnboarding = await createVariationIfNotExists(onboardingFlag.id, "skippable", "skippable");

  // push notifications variations
  const pushV1 = await createVariationIfNotExists(pushNotifFlag.id, "v1", "v1");
  const pushV2 = await createVariationIfNotExists(pushNotifFlag.id, "v2", "v2");

  // offline mode
  const offlineDisabled = await createVariationIfNotExists(offlineModeFlag.id, "disabled", false);
  const offlineEnabled = await createVariationIfNotExists(offlineModeFlag.id, "enabled", true);
  const offlinePartial = await createVariationIfNotExists(offlineModeFlag.id, "partial", "partial");

  console.log(`  ✓ Variations created`);

  // ─── 7. Flag Versions & Targeting Rules ─────────────────────────────────────
  console.log("Creating flag versions and targeting rules...");

  const createVersionIfNotExists = async (
    flagId: string,
    environmentId: string,
    isEnabled: boolean
  ) => {
    const existing = await db.flagVersion.findFirst({
      where: { flagId, environmentId },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;
    return db.flagVersion.create({
      data: { flagId, environmentId, version: 1, isEnabled, compiled: {} },
    });
  };

  // new-checkout-flow: enabled in dev/staging, 50% rollout in prod
  const cvDev = await createVersionIfNotExists(checkoutFlag.id, ecDev.id, true);
  const cvStaging = await createVersionIfNotExists(checkoutFlag.id, ecStaging.id, true);
  const cvProd = await createVersionIfNotExists(checkoutFlag.id, ecProd.id, true);

  // product-recommendations: off in dev, testing in staging, 20% in prod
  const recvDev = await createVersionIfNotExists(recommendationsFlag.id, ecDev.id, false);
  const recvStaging = await createVersionIfNotExists(recommendationsFlag.id, ecStaging.id, true);
  const recvProd = await createVersionIfNotExists(recommendationsFlag.id, ecProd.id, true);

  // dark-mode: enabled everywhere
  const dmvDev = await createVersionIfNotExists(darkModeFlag.id, ecDev.id, true);
  const dmvStaging = await createVersionIfNotExists(darkModeFlag.id, ecStaging.id, true);
  const dmvProd = await createVersionIfNotExists(darkModeFlag.id, ecProd.id, true);

  // free-shipping-banner: enabled in prod only
  const fsvDev = await createVersionIfNotExists(freeShippingFlag.id, ecDev.id, false);
  const fsvStaging = await createVersionIfNotExists(freeShippingFlag.id, ecStaging.id, true);
  const fsvProd = await createVersionIfNotExists(freeShippingFlag.id, ecProd.id, true);

  // discount-rate: enabled in prod
  const drvDev = await createVersionIfNotExists(discountRateFlag.id, ecDev.id, false);
  const drvStaging = await createVersionIfNotExists(discountRateFlag.id, ecStaging.id, true);
  const drvProd = await createVersionIfNotExists(discountRateFlag.id, ecProd.id, true);

  // mobile flags
  const onbvDev = await createVersionIfNotExists(onboardingFlag.id, mobDev.id, true);
  const onbvStaging = await createVersionIfNotExists(onboardingFlag.id, mobStaging.id, true);
  const onbvProd = await createVersionIfNotExists(onboardingFlag.id, mobProd.id, true);

  const pushvDev = await createVersionIfNotExists(pushNotifFlag.id, mobDev.id, true);
  const pushvProd = await createVersionIfNotExists(pushNotifFlag.id, mobProd.id, false);

  const offvDev = await createVersionIfNotExists(offlineModeFlag.id, mobDev.id, true);
  const offvProd = await createVersionIfNotExists(offlineModeFlag.id, mobProd.id, false);

  // Add targeting rules where no rules exist yet
  const addRuleIfNone = async (
    versionId: string,
    condition: unknown,
    rollout: unknown
  ) => {
    const existing = await db.targetingRule.findFirst({ where: { flagVersionId: versionId } });
    if (existing) return existing;
    return db.targetingRule.create({
      data: {
        flagVersionId: versionId,
        orderIndex: 0,
        condition: condition as never,
        rollout: rollout as never,
      },
    });
  };

  // Checkout prod: beta users get new flow, others get 50% rollout
  await addRuleIfNone(
    cvProd.id,
    { attribute: "plan", operator: "eq", value: "enterprise" },
    { variationKey: checkoutTreatment.key }
  );
  await db.targetingRule.create({
    data: {
      flagVersionId: cvProd.id,
      orderIndex: 1,
      condition: { attribute: "key", operator: "regex", value: ".*" } as never,
      rollout: { percentage: 50 } as never,
    },
  }).catch(() => {}); // ignore duplicate

  // Recommendations staging: QA team gets content-based
  await addRuleIfNone(
    recvStaging.id,
    { attribute: "email", operator: "endsWith", value: "@flagship.dev" },
    { variationKey: recContentBased.key }
  );

  // Recommendations prod: 20% rollout with collaborative filter
  await addRuleIfNone(
    recvProd.id,
    { attribute: "plan", operator: "in", value: ["premium", "enterprise"] },
    { variationKey: recCollabFilter.key }
  );

  // Free shipping prod: threshold-75 for regular users, threshold-50 for premium
  await addRuleIfNone(
    fsvProd.id,
    { attribute: "plan", operator: "eq", value: "premium" },
    { variationKey: shippingThreshold50.key }
  );

  // Discount prod: enterprise gets 20%, premium gets 10%
  await addRuleIfNone(
    drvProd.id,
    { attribute: "plan", operator: "eq", value: "enterprise" },
    { variationKey: discount20.key }
  );
  await db.targetingRule.create({
    data: {
      flagVersionId: drvProd.id,
      orderIndex: 1,
      condition: { attribute: "plan", operator: "eq", value: "premium" } as never,
      rollout: { variationKey: discount10.key } as never,
    },
  }).catch(() => {});

  // Mobile onboarding prod: new users (no attributes) get new-flow at 30%
  await addRuleIfNone(
    onbvProd.id,
    { attribute: "key", operator: "regex", value: ".*" },
    { percentage: 30, variationKey: newOnboarding.key }
  );

  console.log(`  ✓ Flag versions and targeting rules created`);

  // ─── 8. Compile all flag versions ────────────────────────────────────────────
  console.log("Compiling flag versions...");

  const allVersions = await db.flagVersion.findMany({
    include: {
      flag: { include: { flagVariations: true } },
      targetingRules: { orderBy: { orderIndex: "asc" } },
    },
  });

  for (const version of allVersions) {
    const compiled = {
      flagKey: version.flag.key,
      enabled: version.isEnabled,
      version: version.version,
      variations: version.flag.flagVariations.map((v) => ({
        id: v.id,
        key: v.key,
        value: v.value,
      })),
      rules: version.targetingRules.map((r) => ({
        orderIndex: r.orderIndex,
        condition: r.condition,
        rollout: r.rollout,
      })),
    };
    await db.flagVersion.update({
      where: { id: version.id },
      data: { compiled: compiled as never },
    });
  }

  console.log(`  ✓ ${allVersions.length} flag versions compiled`);

  // ─── 9. Segments ────────────────────────────────────────────────────────────
  console.log("Creating segments...");

  const createSegmentIfNotExists = async (
    projectId: string,
    key: string,
    name: string,
    description: string,
    rules: unknown[]
  ) => {
    const existing = await db.segment.findFirst({ where: { projectId, key } });
    if (existing) return existing;
    return db.segment.create({ data: { projectId, key, name, description, rules: rules as never } });
  };

  const betaUsersSegment = await createSegmentIfNotExists(
    ecommerceProject.id,
    "beta-users",
    "Beta Users",
    "Early access users opted into beta features",
    [{ attribute: "beta", operator: "eq", value: "true" }]
  );

  const premiumSegment = await createSegmentIfNotExists(
    ecommerceProject.id,
    "premium-customers",
    "Premium Customers",
    "Users on premium or enterprise plans",
    [{ attribute: "plan", operator: "in", value: ["premium", "enterprise"] }]
  );

  const internalSegment = await createSegmentIfNotExists(
    ecommerceProject.id,
    "internal-team",
    "Internal Team",
    "Flagship employees and contractors",
    [{ attribute: "email", operator: "endsWith", value: "@flagship.dev" }]
  );

  const mobileSegment = await createSegmentIfNotExists(
    mobileProject.id,
    "power-users",
    "Power Users",
    "Highly engaged mobile users (10+ sessions/week)",
    [{ attribute: "sessionCount", operator: "gt", value: "10" }]
  );

  // Add segment users
  const segmentUserKeys = [
    "user-001", "user-002", "user-003", "user-004", "user-005",
    "user-006", "user-007", "user-008", "user-009", "user-010",
  ];

  for (const key of segmentUserKeys) {
    await db.segmentUser.upsert({
      where: { segmentId_userKey: { segmentId: betaUsersSegment.id, userKey: key } },
      update: {},
      create: { segmentId: betaUsersSegment.id, userKey: key },
    });
    await db.user.upsert({
      where: { key },
      update: {},
      create: {
        key,
        attributes: {
          email: `${key}@example.com`,
          plan: randomChoice(["free", "premium", "enterprise"]),
          country: randomChoice(["US", "UK", "DE", "FR", "SG"]),
          beta: Math.random() > 0.5 ? "true" : "false",
        },
      },
    });
  }

  const premiumKeys = ["enterprise-001", "enterprise-002", "premium-001", "premium-002", "premium-003"];
  for (const key of premiumKeys) {
    await db.segmentUser.upsert({
      where: { segmentId_userKey: { segmentId: premiumSegment.id, userKey: key } },
      update: {},
      create: { segmentId: premiumSegment.id, userKey: key },
    });
    await db.user.upsert({
      where: { key },
      update: {},
      create: {
        key,
        attributes: {
          email: `${key}@bigcorp.com`,
          plan: key.startsWith("enterprise") ? "enterprise" : "premium",
          country: "US",
        },
      },
    });
  }

  const internalKeys = ["admin@flagship.dev", "developer@flagship.dev", "qa@flagship.dev"];
  for (const key of internalKeys) {
    await db.segmentUser.upsert({
      where: { segmentId_userKey: { segmentId: internalSegment.id, userKey: key } },
      update: {},
      create: { segmentId: internalSegment.id, userKey: key },
    });
  }

  console.log(`  ✓ 4 segments with users`);

  // ─── 10. Events (Analytics Data) ────────────────────────────────────────────
  console.log("Creating events for analytics...");

  const allFlags = [
    { flag: checkoutFlag, env: ecProd, variations: [checkoutControl, checkoutTreatment] },
    { flag: recommendationsFlag, env: ecProd, variations: [recOff, recCollabFilter, recContentBased] },
    { flag: darkModeFlag, env: ecProd, variations: [lightMode, darkMode, systemMode] },
    { flag: freeShippingFlag, env: ecProd, variations: [noShippingBanner, shippingThreshold50, shippingThreshold75] },
    { flag: onboardingFlag, env: mobProd, variations: [oldOnboarding, newOnboarding, skippableOnboarding] },
    { flag: pushNotifFlag, env: mobDev, variations: [pushV1, pushV2] },
  ];

  const userKeys = [...segmentUserKeys, ...premiumKeys, "user-011", "user-012", "user-013", "user-014", "user-015"];
  const now = new Date();

  const eventBatch: Array<{
    environmentId: string;
    flagId: string;
    variationId: string;
    userKey: string;
    timestamp: Date;
    data: never;
  }> = [];

  // Generate 30 days of events
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    for (const { flag, env, variations } of allFlags) {
      // 10-50 evaluations per day per flag
      const count = randomBetween(10, 50);
      for (let i = 0; i < count; i++) {
        const variation = randomChoice(variations);
        const userKey = randomChoice(userKeys);
        const eventTime = new Date(day);
        eventTime.setHours(randomBetween(0, 23), randomBetween(0, 59));

        eventBatch.push({
          environmentId: env.id,
          flagId: flag.id,
          variationId: variation.id,
          userKey,
          timestamp: eventTime,
          data: {} as never,
        });
      }
    }
  }

  // Insert events in batches of 100
  for (let i = 0; i < eventBatch.length; i += 100) {
    await db.event.createMany({
      data: eventBatch.slice(i, i + 100),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ ${eventBatch.length} events created (30 days of data)`);

  // ─── 11. Audit Logs ──────────────────────────────────────────────────────────
  console.log("Creating audit logs...");

  const auditActions = [
    { entityType: "flag", action: "created", actor: adminUser.email },
    { entityType: "flag", action: "updated", actor: devUser.email },
    { entityType: "flag_version", action: "toggled", actor: pmUser.email },
    { entityType: "environment", action: "created", actor: adminUser.email },
    { entityType: "segment", action: "updated", actor: devUser.email },
    { entityType: "targeting_rule", action: "created", actor: devUser.email },
    { entityType: "flag_version", action: "toggled", actor: qaUser.email },
    { entityType: "flag", action: "archived", actor: pmUser.email },
  ];

  for (let i = 0; i < auditActions.length; i++) {
    const { entityType, action, actor } = auditActions[i];
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - i);

    await db.auditLog.create({
      data: {
        projectId: ecommerceProject.id,
        entityType,
        entityId: checkoutFlag.id,
        action,
        actor,
        diff: { before: { isEnabled: false }, after: { isEnabled: true } } as never,
        createdAt,
      },
    });
  }

  console.log(`  ✓ ${auditActions.length} audit log entries`);

  // ─── 12. Webhooks ────────────────────────────────────────────────────────────
  console.log("Creating webhooks...");

  const existingWebhook = await db.webhook.findFirst({
    where: { projectId: ecommerceProject.id, url: "https://hooks.slack.com/demo/flagship" },
  });

  if (!existingWebhook) {
    await db.webhook.create({
      data: {
        projectId: ecommerceProject.id,
        name: "Slack Notifications",
        url: "https://hooks.slack.com/demo/flagship",
        secret: crypto.randomBytes(20).toString("hex"),
        events: ["flag.created", "flag.updated", "flag.toggled"],
        isActive: true,
      },
    });

    await db.webhook.create({
      data: {
        projectId: ecommerceProject.id,
        name: "CI/CD Pipeline Trigger",
        url: "https://api.github.com/repos/example/flagship/dispatches",
        secret: crypto.randomBytes(20).toString("hex"),
        events: ["flag.toggled"],
        isActive: false,
      },
    });
  }

  console.log(`  ✓ Webhooks created`);

  // ─── 13. Schedules ───────────────────────────────────────────────────────────
  console.log("Creating scheduled flag changes...");

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  const existingSchedule = await db.flagSchedule.findFirst({
    where: { flagVersionId: cvProd.id, status: "pending" },
  });

  if (!existingSchedule) {
    await db.flagSchedule.create({
      data: {
        flagVersionId: cvProd.id,
        action: "enable",
        scheduledAt: tomorrow,
        status: "pending",
        payload: {} as never,
      },
    });

    await db.flagSchedule.create({
      data: {
        flagVersionId: recvProd.id,
        action: "update_rollout",
        scheduledAt: nextWeek,
        status: "pending",
        payload: { rollout: { percentage: 50 } } as never,
      },
    });
  }

  console.log(`  ✓ Schedules created`);

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete! Summary:");
  console.log("  Users (5): admin, developer, pm, qa, viewer — all password: password123");
  console.log("  Projects: E-commerce Platform, Mobile App");
  console.log("  Environments: dev, staging, production × 2 projects");
  console.log("  Flags: 5 (e-commerce) + 3 (mobile) = 8 total");
  console.log("  Segments: 4 (beta-users, premium-customers, internal-team, power-users)");
  console.log(`  Events: ${eventBatch.length} events over 30 days`);
  console.log("  Webhooks: 2 (1 active Slack, 1 inactive CI/CD)");
  console.log("  Schedules: 2 pending");
  console.log("\n  Login: admin@flagship.dev / password123");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
