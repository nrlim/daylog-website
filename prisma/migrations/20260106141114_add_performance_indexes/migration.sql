-- Database Indexes for Performance Optimization
-- This migration creates indexes to optimize common query patterns

-- Activity table indexes
CREATE INDEX IF NOT EXISTS "idx_activity_user_date" ON "Activity"("userId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_activity_status" ON "Activity"("status");
CREATE INDEX IF NOT EXISTS "idx_activity_user_status" ON "Activity"("userId", "status");

-- WFHRecord table indexes
CREATE INDEX IF NOT EXISTS "idx_wfhrecord_user_team_date" ON "WFHRecord"("userId", "teamId", "date");
CREATE INDEX IF NOT EXISTS "idx_wfhrecord_user_month_year" ON "WFHRecord"("userId", "month", "year");

-- TeamMember table indexes
CREATE INDEX IF NOT EXISTS "idx_team_member_user" ON "TeamMember"("userId");
CREATE INDEX IF NOT EXISTS "idx_team_member_team" ON "TeamMember"("teamId");
CREATE INDEX IF NOT EXISTS "idx_team_member_role" ON "TeamMember"("role");

-- User table indexes
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User"("role");
CREATE INDEX IF NOT EXISTS "idx_user_username" ON "User"("username");

-- PokerSession indexes
CREATE INDEX IF NOT EXISTS "idx_poker_session_team" ON "PokerSession"("teamId");
CREATE INDEX IF NOT EXISTS "idx_poker_session_status" ON "PokerSession"("status");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_activity_user_date_status" ON "Activity"("userId", "date" DESC, "status");
CREATE INDEX IF NOT EXISTS "idx_wfhrecord_user_team_month_year" ON "WFHRecord"("userId", "teamId", "month", "year");
