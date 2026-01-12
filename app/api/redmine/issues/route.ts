import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const REDMINE_URL = process.env.REDMINE_API_URL;

const getRedmineCredentials = (request: NextRequest): { username: string; password: string } | null => {
  let credsCookie = request.cookies.get('redmine_creds')?.value;

  if (!credsCookie) {
    credsCookie = (request.headers.get('x-redmine-credentials') as string) || undefined;
  }

  if (!credsCookie) {
    return null;
  }

  try {
    const decoded = Buffer.from(credsCookie, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    return { username, password };
  } catch (error) {
    console.error('Failed to decode redmine_creds:', error);
    return null;
  }
};

const createAuthHeader = (username: string, password: string): string => {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
};

const makeRedmineRequest = async (endpoint: string, creds: any, config: any = {}) => {
  try {
    return await axios.get(`${REDMINE_URL}${endpoint}`, {
      ...config,
      headers: {
        ...config.headers,
        'X-Redmine-API-Key': creds.password,
        'Content-Type': 'application/json',
      },
    });
  } catch (tokenError: any) {
    if (tokenError.response?.status === 401) {
      return axios.get(`${REDMINE_URL}${endpoint}`, {
        ...config,
        headers: {
          ...config.headers,
          'Authorization': createAuthHeader(creds.username, creds.password),
          'Content-Type': 'application/json',
        },
      });
    }
    throw tokenError;
  }
};

export async function GET(request: NextRequest) {
  try {
    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({
        error: 'Redmine credentials not found',
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: Record<string, string | number> = Object.fromEntries(searchParams);

    // Include all statuses (open and closed) - Redmine default only returns open
    // Use status_id=* to get all statuses
    if (!params.status_id) {
      params.status_id = '*';
    }

    const response = await makeRedmineRequest('/issues.json', creds, {
      params,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({
      error: error.response?.data?.error || 'Failed to fetch issues',
    }, { status: error.response?.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({ error: 'Redmine credentials not found' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, tracker_id, subject, description, priority_id, assigned_to_id, parent_issue_id } = body;

    if (!project_id || !subject) {
      return NextResponse.json({ error: 'project_id and subject are required' }, { status: 400 });
    }

    const issueData: any = {
      project_id,
      tracker_id: tracker_id || 1,
      subject,
      description: description || '',
      priority_id: priority_id || 2,
    };

    if (assigned_to_id) {
      issueData.assigned_to_id = assigned_to_id;
    }

    if (parent_issue_id) {
      issueData.parent_issue_id = parseInt(parent_issue_id as string);
    }

    const response = await axios.post(
      `${REDMINE_URL}/issues.json`,
      { issue: issueData },
      {
        headers: {
          'Authorization': createAuthHeader(creds.username, creds.password),
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create issue:', error.message);
    return NextResponse.json({
      error: error.response?.data?.error || 'Failed to create issue',
    }, { status: error.response?.status || 500 });
  }
}
