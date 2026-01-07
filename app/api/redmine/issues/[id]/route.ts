import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const REDMINE_URL = process.env.REDMINE_API_URL;

const getRedmineCredentials = (request: NextRequest): { username: string; password: string } | null => {
  let credsCookie = request.cookies.get('redmine_creds')?.value;

  if (!credsCookie) {
    credsCookie = (request.headers.get('x-redmine-credentials') as string | null) || undefined;
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({ error: 'Redmine credentials not found' }, { status: 401 });
    }

    const response = await axios.get(`${REDMINE_URL}/issues/${params.id}.json`, {
      headers: {
        'Authorization': createAuthHeader(creds.username, creds.password),
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to fetch issue:', error.message);
    return NextResponse.json({
      error: error.response?.data?.error || 'Failed to fetch issue',
    }, { status: error.response?.status || 500 });
  }
}
