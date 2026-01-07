import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: 'Logout successful' });
    response.cookies.delete('token');
    response.cookies.delete('redmine_creds');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
