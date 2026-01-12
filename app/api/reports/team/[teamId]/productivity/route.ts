import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import { format } from 'date-fns';

const REDMINE_URL = process.env.REDMINE_API_URL;
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;
const REDMINE_USERNAME = process.env.REDMINE_USERNAME;
const REDMINE_PASSWORD = process.env.REDMINE_PASSWORD;

// Cache for Redmine user lookups (1 hour TTL)
const redmineUserCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Request timeout constants
const REDMINE_TIMEOUT = 8000; // 8 seconds
const QUERY_TIMEOUT = 45000; // 45 seconds (increased from 30s for reliability)

/**
 * Create Redmine API headers - supports both API Key and Basic Auth
 */
function getRedmineHeaders() {
  const headers: any = {
    'Accept': 'application/json',
  };

  if (REDMINE_USERNAME && REDMINE_PASSWORD) {
    // Use Basic Authentication
    const credentials = Buffer.from(`${REDMINE_USERNAME}:${REDMINE_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (REDMINE_API_KEY) {
    // Use API Key
    headers['X-Redmine-API-Key'] = REDMINE_API_KEY;
  }

  return headers;
}

/**
 * Helper to format date range as YYYY-MM-DD for Redmine API
 */
function formatDateRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: format(firstDay, 'yyyy-MM-dd'),
    to: format(lastDay, 'yyyy-MM-dd'),
  };
}

/**
 * Fetch Redmine user by username to get their ID and profile
 * Uses caching to reduce API calls
 */
async function getRedmineUserIdByUsername(username: string, offset: number = 0): Promise<string | null> {
  if (!REDMINE_URL || !REDMINE_API_KEY) {
    return null;
  }

  // Check cache first
  const cached = redmineUserCache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.id;
  }

  try {
    // Fetch user by login with offset for pagination
    const response = await axios.get(`${REDMINE_URL}/users.json`, {
      params: {
        login: username,
        limit: 100,
        offset: offset,
      },
      headers: getRedmineHeaders(),
      timeout: REDMINE_TIMEOUT,
    });

    // Match exact login to username
    const user = response.data.users?.find((u: any) => u.login === username);
    if (user) {
      const userId = user.id.toString();
      // Cache the result
      redmineUserCache.set(username, { id: userId, timestamp: Date.now() });
      return userId;
    }

    // Check if there are more results to fetch
    const total = response.data.total_count || 0;
    const limit = response.data.limit || 100;
    const nextOffset = offset + limit;

    if (nextOffset < total) {
      // Recursively try next offset
      return getRedmineUserIdByUsername(username, nextOffset);
    }
    return null;
  } catch (error: any) {
    console.error(`Failed to fetch Redmine user ${username}:`, error.message);
    return null;
  }
}

/**
 * Helper function to fetch all issues with pagination for a user
 */
async function fetchAllIssuesForUser(username: string, userId: string, from: string, to: string): Promise<any[]> {
  const allIssues: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(`${REDMINE_URL}/issues.json`, {
        params: {
          assigned_to_id: userId,
          created_on: `><${from}|${to}`,
          limit: 100,
          offset: offset,
        },
        headers: getRedmineHeaders(),
        timeout: REDMINE_TIMEOUT,
      });

      const issues = response.data.issues || [];
      const totalCount = response.data.total_count || 0;
      allIssues.push(...issues);

      // Check if there are more results to fetch
      if (allIssues.length >= totalCount) {
        hasMore = false;
      } else {
        offset += 100;
      }
    } catch (error: any) {
      hasMore = false;
    }
  }

  return allIssues;
}

/**
 * Helper function to fetch closed issues with pagination for a user
 */
async function fetchClosedIssuesForUser(username: string, userId: string, from: string, to: string): Promise<any[]> {
  const allClosedIssues: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(`${REDMINE_URL}/issues.json`, {
        params: {
          assigned_to_id: userId,
          status_id: 'closed',
          created_on: `><${from}|${to}`,
          limit: 100,
          offset: offset,
        },
        headers: getRedmineHeaders(),
        timeout: REDMINE_TIMEOUT,
      });

      const issues = response.data.issues || [];
      const totalCount = response.data.total_count || 0;
      allClosedIssues.push(...issues);

      // Check if there are more results to fetch
      if (allClosedIssues.length >= totalCount) {
        hasMore = false;
      } else {
        offset += 100;
      }
    } catch (error: any) {
      hasMore = false;
    }
  }

  return allClosedIssues;
}

/**
 * Batch fetch Redmine issues for multiple users
 * Reduces N+1 query problem by fetching all issues in parallel
 */
async function batchFetchRedmineIssues(usernames: string[], dateFrom: string, dateTo: string): Promise<Map<string, { issues: any[], closedIssues: any[] }>> {
  if (!REDMINE_URL || !REDMINE_API_KEY || usernames.length === 0) {
    return new Map();
  }

  const issuesMap = new Map<string, { issues: any[], closedIssues: any[] }>();

  try {
    const userIdMap = new Map<string, string>();

    // For each member, get their Redmine profile details
    for (const username of usernames) {
      const userId = await getRedmineUserIdByUsername(username);
      if (userId) {
        userIdMap.set(username, userId);
      }
    }

    // Fetch all issues in parallel using user IDs
    const promises = usernames.map(async (username) => {
      const userId = userIdMap.get(username);

      // Use user ID if found, otherwise skip this user
      if (!userId) {
        return { username, issues: [], closedIssues: [] };
      }

      try {
        const issues = await fetchAllIssuesForUser(username, userId, dateFrom, dateTo);
        const closedIssues = await fetchClosedIssuesForUser(username, userId, dateFrom, dateTo);
        return { username, issues, closedIssues };
      } catch (error) {
        return { username, issues: [], closedIssues: [] };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ username, issues, closedIssues }) => {
      issuesMap.set(username, { issues, closedIssues });
    });
  } catch (error) {
    // Error silently handled
  }

  return issuesMap;
}

/**
 * Process Redmine stats for a single user
 */
function processRedmineStats(issues: any[], closedIssues: any[]) {
  const newStatusIds = [1]; // Status ID for "New"
  const newStatusNames = ['new']; // Status name patterns (lowercased)

  const inProgressStatusIds = [2]; // Status ID for "In Progress"
  const inProgressStatusNames = ['in progress', 'inprogress', 'testing']; // Status name patterns (lowercased)

  const newIssuesCount = issues.filter((issue: any) => {
    const statusName = issue.status?.name?.toString().toLowerCase().trim();
    const statusId = issue.status?.id;
    // Check by ID first, then by exact name match
    return newStatusIds.includes(statusId) ||
      newStatusNames.some(s => statusName === s);
  }).length;

  const inProgressIssuesCount = issues.filter((issue: any) => {
    const statusName = issue.status?.name?.toString().toLowerCase().trim();
    const statusId = issue.status?.id;
    // Check by ID first, then by exact name match
    return inProgressStatusIds.includes(statusId) ||
      inProgressStatusNames.some(s => statusName === s);
  }).length;

  // Use actual closed issues count from separate query
  const closedIssuesCount = closedIssues.length;

  // Total assigned = New + In Progress + Closed
  const totalIssues = newIssuesCount + inProgressIssuesCount + closedIssuesCount;

  return {
    assignedIssues: totalIssues,
    newIssues: newIssuesCount,
    inProgressIssues: inProgressIssuesCount,
    closedIssues: closedIssuesCount,
  };
}

/**
 * Calculate productivity metrics using three different POV options
 */
function calculateProductivityMetrics(
  daylogActivities: any[],
  redmineIssues: any[],
  redmineClosedIssues: any[]
) {


  const daylogCompleted = daylogActivities.filter((a) => a.status?.toLowerCase() === 'done').length;
  const redmineCompleted = redmineClosedIssues.length;

  // Calculate individual completion rates
  const daylogRate = daylogActivities.length > 0
    ? (daylogCompleted / daylogActivities.length) * 100
    : 0;
  const redmineRate = redmineIssues.length > 0
    ? (redmineCompleted / redmineIssues.length) * 100
    : 0;

  // Option 1: Combined Completion Rate (75% Redmine / 25% Daylog)
  let option1Score: number;
  if (daylogActivities.length === 0) {
    option1Score = Math.min(100, redmineRate);
  } else {
    option1Score = Math.min(100, parseFloat((
      (redmineRate * 0.75) + (daylogRate * 0.25)
    ).toFixed(1)));
  }

  // Option 2: Weighted Performance (50% Redmine / 50% Daylog)
  let option2Score: number;
  if (daylogActivities.length === 0) {
    option2Score = Math.min(100, redmineRate);
  } else {
    option2Score = Math.min(100, parseFloat((
      (redmineRate * 0.50) + (daylogRate * 0.50)
    ).toFixed(1)));
  }

  // Option 3: Time-based Efficiency
  let option3Data = {
    daylogDurations: [] as Array<{ duration: number; isCompleted: boolean }>,
    redmineDurations: [] as Array<{ duration: number; isCompleted: boolean }>,
    avgDaylogDuration: 0,
    avgRedmineDuration: 0,
    timeEfficiencyScore: 0,
  };

  // Calculate daylog durations (using actual start time and completion time)
  // Convert to minutes (keep as minutes for better precision)
  const WORKING_MINUTES_PER_DAY = 480; // 8 hours = 480 minutes

  const completedDaylogDurations = daylogActivities
    .filter((a) => a.status?.toLowerCase() === 'done' && a.updatedAt)
    .map((a) => {
      // Calculate actual start time: use date + time if available, otherwise use createdAt
      let startTime: Date;
      if (a.date && a.time) {
        // Parse date (YYYY-MM-DD) and time (HH:MM) to create a datetime
        const [hours, minutes] = a.time.split(':').map(Number);
        startTime = new Date(a.date);
        startTime.setHours(hours, minutes, 0, 0);
      } else {
        startTime = new Date(a.createdAt);
      }

      // Completion time is when user marked as done (updatedAt)
      const completionTime = new Date(a.updatedAt);

      // Calculate duration in minutes
      const durationMinutes = Math.max(1, (completionTime.getTime() - startTime.getTime()) / (1000 * 60));

      return {
        duration: durationMinutes, // in minutes
        isCompleted: true,
      };
    });

  option3Data.daylogDurations = completedDaylogDurations;
  option3Data.avgDaylogDuration = completedDaylogDurations.length > 0
    ? completedDaylogDurations.reduce((sum, d) => sum + d.duration, 0) / completedDaylogDurations.length
    : 0;

  // Calculate redmine durations (using closed_on - created_on for closed issues)
  // Create a Set for O(1) lookup instead of using .some()
  const closedRedmineIds = new Set(redmineClosedIssues.map((i) => i.id));

  const closedRedmineDurations = redmineClosedIssues
    .filter((i) => i.created_on && i.closed_on)
    .map((i) => {
      const durationHours = (new Date(i.closed_on).getTime() - new Date(i.created_on).getTime()) / (1000 * 60 * 60);
      const durationMinutes = Math.max(1, durationHours * 60); // Convert to minutes
      return {
        duration: durationMinutes, // in minutes
        isCompleted: true,
      };
    });

  const openRedmineDurations = redmineIssues
    .filter((i) => !closedRedmineIds.has(i.id) && i.created_on)
    .map((i) => {
      const durationHours = (new Date().getTime() - new Date(i.created_on).getTime()) / (1000 * 60 * 60);
      const durationMinutes = Math.max(1, durationHours * 60); // Convert to minutes
      return {
        duration: durationMinutes, // in minutes
        isCompleted: false,
      };
    });

  option3Data.redmineDurations = [...closedRedmineDurations, ...openRedmineDurations];
  option3Data.avgRedmineDuration = closedRedmineDurations.length > 0
    ? closedRedmineDurations.reduce((sum, d) => sum + d.duration, 0) / closedRedmineDurations.length
    : 0;

  // Time efficiency: completed tasks / total working minutes spent
  // This measures tasks completed per working period (scaled to per working day)
  const completedCount = completedDaylogDurations.length + closedRedmineDurations.length;
  const totalWorkingMinutes = completedDaylogDurations.reduce((sum, d) => sum + d.duration, 0)
    + closedRedmineDurations.reduce((sum, d) => sum + d.duration, 0);

  // Convert to working days for calculation
  const totalWorkingDays = totalWorkingMinutes / WORKING_MINUTES_PER_DAY;

  // Tasks per working day, scaled to 0-100 (assume 4-5 tasks per day is excellent = 100)
  const tasksPerWorkingDay = totalWorkingDays > 0 ? completedCount / totalWorkingDays : 0;
  const rawTimeEfficiencyScore = Math.min(100, (tasksPerWorkingDay / 4) * 100); // 4 tasks/day = 100 points

  option3Data.timeEfficiencyScore = Math.min(100, parseFloat(rawTimeEfficiencyScore.toFixed(1)));

  // Final Combined Score: 
  // - If NO daylog activities: 100% trust Redmine score
  // - If HAS daylog activities: 75% Redmine + 25% Daylog (already calculated in option1)
  // Option 1 (Combined Completion Rate) already handles these weights correctly
  const finalScore = option1Score;

  return {
    option1: { score: option1Score, label: 'Combined Completion Rate' },
    option2: { score: option2Score, label: 'Weighted Performance' },
    option3: {
      score: option3Data.timeEfficiencyScore,
      ...option3Data,
      label: 'Time-based Efficiency'
    },
    finalScore: {
      score: finalScore,
      label: 'Final Productivity Score',
      description: daylogActivities.length === 0
        ? 'Redmine-only (100% weight): Calculated from Redmine issue completion rate'
        : 'Combined score (50% Redmine + 50% Daylog): Weighted completion rate',
      weights: daylogActivities.length === 0
        ? { redmine: 1.0 }
        : { redmine: 0.50, daylog: 0.50 }
    }
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const startTime = Date.now();

  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify user is admin or team lead (but not team_admin)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Global admin can access
    if (user.role !== 'admin') {
      // Non-admin must be team lead (not team_admin, not regular member)
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: auth.userId,
            teamId: params.teamId,
          },
        },
      });

      if (!teamMember || !teamMember.isLead || teamMember.role === 'team_admin') {
        return NextResponse.json({ error: 'Only team leads and admins can view productivity reports' }, { status: 403 });
      }
    }

    // Get team details
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      select: { id: true, name: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
      include: {
        user: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
    });

    // Filter out admin users
    const filteredMembers = teamMembers.filter((m: typeof teamMembers[0]) => m.user.role !== 'admin');
    const memberIds = filteredMembers.map((m: typeof filteredMembers[0]) => m.user.id);

    // Build query for activities with optimized select
    const whereClause: any = {
      userId: { in: memberIds },
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get activities with minimal fields for performance
    const activities = await prisma.activity.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        status: true,
        date: true,
        time: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Batch fetch Redmine issues for all team members in parallel (prevents N+1 queries)
    const usernames = filteredMembers.map(m => m.user.username);
    const dateFrom = startDate || formatDateRange().from;
    const dateTo = endDate || formatDateRange().to;

    // Fetch Redmine data in parallel with timeout protection
    const redminePromise = Promise.race([
      batchFetchRedmineIssues(usernames, dateFrom, dateTo),
      new Promise<Map<string, { issues: any[], closedIssues: any[] }>>((resolve) =>
        setTimeout(() => resolve(new Map()), QUERY_TIMEOUT)
      ),
    ]);
    const redmineIssuesMap = await redminePromise;

    // Calculate productivity metrics
    const memberProductivity = filteredMembers.map((member: typeof filteredMembers[0]) => {
      const memberActivities = activities.filter((a: typeof activities[0]) => a.userId === member.user.id);

      // Normalize status values to be case-insensitive
      const doneActivities = memberActivities.filter((a: typeof memberActivities[0]) =>
        a.status?.toLowerCase() === 'done'
      );
      const inProgressActivities = memberActivities.filter((a: typeof memberActivities[0]) =>
        a.status?.toLowerCase() === 'inprogress' || a.status?.toLowerCase() === 'in progress'
      );
      const blockedActivities = memberActivities.filter((a: typeof memberActivities[0]) =>
        a.status?.toLowerCase() === 'blocked'
      );

      // Get pre-fetched Redmine issues - use username from the map
      const memberIssuesData = redmineIssuesMap.get(member.user.username) || { issues: [], closedIssues: [] };
      const redmineStats = processRedmineStats(memberIssuesData.issues, memberIssuesData.closedIssues);

      // Calculate stats for daylog activities only
      const totalTasks = memberActivities.length;
      const completedTasks = doneActivities.length;
      const inProgressTasks = inProgressActivities.length;

      const daylogCompletionRate = Math.min(100, totalTasks > 0
        ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1))
        : 0);

      // Calculate stats for Redmine issues only
      const redmineTotal = redmineStats.assignedIssues;
      const redmineCompletionRate = Math.min(100, redmineTotal > 0
        ? parseFloat(((redmineStats.closedIssues / redmineTotal) * 100).toFixed(1))
        : 0);

      // Calculate all three productivity options
      // Pass all redmine issues (open + closed) for accurate calculation
      const allRedmineIssues = [...memberIssuesData.issues, ...memberIssuesData.closedIssues];

      const productivityMetrics = calculateProductivityMetrics(
        memberActivities,
        allRedmineIssues,
        memberIssuesData.closedIssues
      );

      return {
        memberId: member.user.id,
        username: member.user.username,
        role: member.role,
        isLead: member.isLead,
        // Flatten daylog stats
        totalTasks,
        completedTasks,
        blockedTasks: blockedActivities.length,
        completionRate: daylogCompletionRate,
        // Include Redmine stats
        redmineStats: {
          assignedIssues: redmineStats.assignedIssues,
          newIssues: redmineStats.newIssues,
          inProgressIssues: redmineStats.inProgressIssues,
          closedIssues: redmineStats.closedIssues,
          completionRate: redmineCompletionRate,
        },
        // Productivity metrics (only send necessary fields, remove duration arrays)
        productivityMetrics: {
          option1: productivityMetrics.option1,
          option2: productivityMetrics.option2,
          option3: {
            score: productivityMetrics.option3.score,
            label: productivityMetrics.option3.label,
            avgDaylogDuration: productivityMetrics.option3.avgDaylogDuration,
            avgRedmineDuration: productivityMetrics.option3.avgRedmineDuration,
            timeEfficiencyScore: productivityMetrics.option3.timeEfficiencyScore,
          },
          finalScore: productivityMetrics.finalScore,
        },
      };
    })

    const duration = Date.now() - startTime;
    console.log(`Productivity report generated for team ${params.teamId} in ${duration}ms (${memberProductivity.length} members)`);

    return NextResponse.json({
      team: {
        id: params.teamId,
        name: team.name,
      },
      period: startDate && endDate ? { startDate, endDate } : 'all',
      memberProductivity,
      summary: {
        totalMembers: filteredMembers.length,
        totalActivities: activities.length,
        totalCompleted: activities.filter((a: typeof activities[0]) => a.status?.toLowerCase() === 'done').length,
        averageCompletionRate:
          memberProductivity.length > 0
            ? Math.min(100, parseFloat((memberProductivity.reduce((sum: number, m: typeof memberProductivity[0]) => sum + m.completionRate, 0) / memberProductivity.length).toFixed(1)))
            : 0,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes to reduce repeated requests
        'Content-Type': 'application/json; charset=utf-8',
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Error generating productivity report:', {
      teamId: params.teamId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      { error: 'Failed to generate productivity report', details: error.message },
      { status: 500 }
    );
  }
}
