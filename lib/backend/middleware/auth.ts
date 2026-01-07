import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  userRole?: string;
}

export async function authMiddleware(request: NextRequest) {
  try {
    // Try to get token from cookie first
    let token = request.cookies.get('token')?.value;
    
    // If no cookie, try Authorization header
    if (!token && request.headers.get('authorization')) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      userId: string; 
      role: string;
      authType?: string;
      redmineUsername?: string;
    };
    
    return {
      userId: decoded.userId,
      userRole: decoded.role,
      authType: decoded.authType,
      redmineUsername: decoded.redmineUsername,
    };
  } catch (error: any) {
    return null;
  }
}

export function createAuthError(message: string = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}
