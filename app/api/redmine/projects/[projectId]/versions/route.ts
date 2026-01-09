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

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({ error: 'Redmine credentials not found' }, { status: 401 });
    }

    const response = await axios.get(
      `${REDMINE_URL}/projects/${params.projectId}/versions.json`,
      {
        auth: {
          username: creds.username,
          password: creds.password,
        },
      }
    );

    return NextResponse.json({ versions: response.data.versions || [] });
  } catch (error: any) {
    console.error('Failed to fetch versions:', error.message);
    return NextResponse.json({
      error: error.message || 'Failed to fetch versions',
    }, { status: error.response?.status || 500 });
  }
}
