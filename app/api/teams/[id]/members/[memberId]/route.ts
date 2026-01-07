import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await prisma.teamMember.delete({
      where: { id: params.memberId },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
