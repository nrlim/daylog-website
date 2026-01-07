import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/backend/config';

async function validateWithRedmine(
  username: string,
  password: string,
  redmineUrl: string
) {
  try {
    let response;
    
    try {
      // Try with API token first
      response = await axios.get(`${redmineUrl}/users/current.json`, {
        headers: {
          'X-Redmine-API-Key': password,
          'Content-Type': 'application/json',
        },
      });
    } catch (tokenError: any) {
      if (tokenError.response?.status === 401) {
        // Try basic auth
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        response = await axios.get(`${redmineUrl}/users/current.json`, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        throw tokenError;
      }
    }

    // Create or get user
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username,
          password: '',
          email: response.data.user.mail || null,
          role: 'member',
        },
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        authType: 'redmine',
        redmineUsername: username,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const credsCookie = Buffer.from(`${username}:${password}`).toString('base64');

    return { token, credsCookie, user, success: true };
  } catch (error: any) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const redmineUrl = process.env.REDMINE_API_URL || 'https://devops.quadrant-si.id/redmine';
    
    // Only allow Redmine authentication
    const result = await validateWithRedmine(username, password, redmineUrl);

    // Extract authType from JWT payload
    const decodedToken: any = jwt.decode(result.token);
    const authType = decodedToken?.authType || 'redmine';

    const response = NextResponse.json({
      message: 'Login successful',
      token: result.token,
      redmine_creds: result.credsCookie,
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        authType: authType,
      },
    });

    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    response.cookies.set('redmine_creds', result.credsCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return response;
  } catch (error: any) {
    let errorMsg = 'Invalid credentials';
    let status = 401;

    if (error.response?.status === 401) {
      errorMsg = 'Invalid username or password';
    } else if (error.response?.status === 403) {
      errorMsg = 'Access forbidden';
    } else if (error.response?.status === 404) {
      errorMsg = 'Server not found';
    } else if (!error.response) {
      errorMsg = 'Server connection failed';
    }

    return NextResponse.json({ error: errorMsg }, { status });
  }
}
