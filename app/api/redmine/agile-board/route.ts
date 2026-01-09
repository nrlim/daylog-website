import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const REDMINE_URL = 'https://devops.quadrant-si.id/redmine';

const getRedmineCredentials = (request: NextRequest) => {
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

export async function GET(request: NextRequest) {
  try {
    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({ error: 'Redmine credentials not found' }, { status: 401 });
    }

    const response = await axios.get(`${REDMINE_URL}/agile/board`, {
      headers: {
        'Authorization': createAuthHeader(creds.username, creds.password),
        'User-Agent': 'DayLog-Client/1.0',
      },
      timeout: 10000,
    });

    // Return HTML with proper headers
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[AGILE BOARD PROXY] Error:', error.message);
    
    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'Authentication failed - Invalid Redmine credentials' },
        { status: 401 }
      );
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { 
          error: 'Cannot connect to Redmine server',
          message: `Unable to reach ${REDMINE_URL}. Please verify the URL is correct and accessible.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to load agile board',
        message: error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
