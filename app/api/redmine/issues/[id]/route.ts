import { NextRequest, NextResponse } from 'next/server';
import { RedmineService } from '@/lib/redmine';

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
  { params }: { params: { id: string } }
) {
  try {
    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({ error: 'Redmine credentials not found' }, { status: 401 });
    }

    const redmine = new RedmineService(
      { baseUrl: REDMINE_URL || '' },
      creds.username,
      creds.password
    );

    const issue = await redmine.getIssue(parseInt(params.id));

    return NextResponse.json(issue);
  } catch (error: any) {
    console.error('Failed to fetch issue:', error.message);
    return NextResponse.json({
      error: error.message || 'Failed to fetch issue',
    }, { status: error.status || 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });
    }

    const creds = getRedmineCredentials(request);
    if (!creds) {
      return NextResponse.json({ error: 'Redmine credentials not found' }, { status: 401 });
    }

    const body = await request.json();
    const { statusId, status_id, notes, subject, description, priority_id, assigned_to_id } = body;
    
    // Support both statusId and status_id for drag-drop
    const finalStatusId = statusId || status_id;

    // Build update data based on what was provided
    const updateData: any = {};
    if (finalStatusId) updateData.status_id = finalStatusId;
    if (subject) updateData.subject = subject;
    if (description !== undefined) updateData.description = description;
    if (priority_id) updateData.priority_id = priority_id;
    if (assigned_to_id) updateData.assigned_to_id = assigned_to_id;
    if (notes?.trim()) updateData.notes = notes;

    // Check if we have anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const redmine = new RedmineService(
      { baseUrl: REDMINE_URL || '' },
      creds.username,
      creds.password
    );

    try {
      await redmine.updateIssue(parseInt(ticketId), updateData);
    } catch (updateError: any) {
      // Check if it's a workflow restriction
      if (updateError.message?.includes('transition') || updateError.message?.includes('workflow')) {
        return NextResponse.json({
          error: 'Status transition not allowed',
          message: 'This status change is not permitted by Redmine workflow rules.',
        }, { status: 422 });
      }
      throw updateError;
    }

    // Only verify status on status updates (skip verification for other field updates for speed)
    if (finalStatusId) {
      const verifiedIssue = await redmine.getIssue(parseInt(ticketId));
      if (verifiedIssue.status.id !== finalStatusId) {
        return NextResponse.json({
          error: 'Status update verification failed',
          expected: finalStatusId,
          actual: verifiedIssue.status.id,
        }, { status: 422 });
      }
    }

    return NextResponse.json({
      success: true,
      ticketId,
      newStatus: finalStatusId,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    console.error('Ticket update failed:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to update ticket' },
      { status: error.status || 500 }
    );
  }
}
