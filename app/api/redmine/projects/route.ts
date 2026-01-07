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

    // Ensure we get all projects including private ones by setting limit high
    if (!params.limit) {
      params.limit = 100;
    }

    const response = await makeRedmineRequest('/projects.json', creds, {
      params,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({
      error: error.response?.data?.error || 'Failed to fetch projects',
    }, { status: error.response?.status || 500 });
  }
}
