/**
 * API Error Handling Utilities
 * Provides standardized error responses and error classification
 */

import { NextResponse } from 'next/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Classify and handle different error types
 */
export function handleError(error: unknown) {
  // App errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message,
        errorCode: error.errorCode,
        ...(error instanceof ValidationError && error.details && { details: error.details })
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      return NextResponse.json(
        {
          error: `A record with this ${target?.[0] || 'value'} already exists`,
          errorCode: 'UNIQUE_CONSTRAINT_ERROR'
        },
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
      // Record not found
      return NextResponse.json(
        { error: 'Record not found', errorCode: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    // Generic database error
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Database operation failed', errorCode: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }

  // Axios/Network errors
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as any;
    console.error('External service error:', axiosError.message);
    return NextResponse.json(
      { error: 'External service error', errorCode: 'EXTERNAL_SERVICE_ERROR' },
      { status: 503 }
    );
  }

  // JSON parsing errors
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Invalid request body', errorCode: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  // Generic error
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

/**
 * Safe async handler wrapper
 */
export function asyncHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}
