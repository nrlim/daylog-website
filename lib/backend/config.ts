/**
 * Application Configuration
 * Environment variables can override these defaults
 */

// Constants
const DEFAULT_WFH_LIMIT = 3;
const DEFAULT_REDMINE_URL = 'https://devops.quadrant-si.id/redmine';
const DEFAULT_REDMINE_PROJECT_ID = 'my-project';
const DEFAULT_PORT = 3001;

// Validation helper
function validateRequiredEnv(envVar: string, errorMessage: string): void {
  if (!process.env[envVar]) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[PRODUCTION] ${errorMessage}`);
    } else {
      console.warn(`⚠️  ${errorMessage}`);
    }
  }
}

export const config = {
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  
  // Server Configuration
  port: parseInt(process.env.PORT || String(DEFAULT_PORT)),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
  
  // Redmine Configuration
  redmineUrl: process.env.REDMINE_API_URL || DEFAULT_REDMINE_URL,
  redmineProjectId: process.env.REDMINE_PROJECT_ID || DEFAULT_REDMINE_PROJECT_ID,
  
  // Feature Flags
  useRedmineAuth: process.env.USE_REDMINE_AUTH !== 'false',
  
  // WFH Configuration
  defaultWfhLimitPerMonth: DEFAULT_WFH_LIMIT,
} as const;

// Validate required configuration
try {
  validateRequiredEnv('DATABASE_URL', 'DATABASE_URL not set');
  validateRequiredEnv('DIRECT_URL', 'DIRECT_URL not set');
  validateRequiredEnv('JWT_SECRET', 'JWT_SECRET not set');
  
  if (config.nodeEnv === 'production' && config.jwtSecret === 'default-secret-key-change-in-production') {
    throw new Error('[PRODUCTION] JWT_SECRET must be set to a secure value in production!');
  }
} catch (error) {
  if (config.nodeEnv === 'production') {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}

export default config;
