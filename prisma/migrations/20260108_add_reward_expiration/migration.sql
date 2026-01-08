-- Add expiration date fields to Reward and Redemption models

-- Add expiresAt to Reward table
ALTER TABLE "Reward" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Add expiresAt to Redemption table
ALTER TABLE "Redemption" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Add comment to explain the fields
COMMENT ON COLUMN "Reward"."expiresAt" IS 'When this reward expires (null = no expiration, WFH quota expires at end of month)';
COMMENT ON COLUMN "Redemption"."expiresAt" IS 'When this redemption expires (null = uses reward expiration or monthly reset for WFH)';
