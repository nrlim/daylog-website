/**
 * Input validation schemas and utilities
 * Provides centralized validation for API requests
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class RequestValidator {
  static validateActivityCreate(body: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate date
    if (!body.date) {
      errors.push({ field: 'date', message: 'Date is required' });
    } else if (!(body.date instanceof Date || typeof body.date === 'string')) {
      errors.push({ field: 'date', message: 'Date must be a valid ISO string or Date' });
    }

    // Validate subject
    if (!body.subject || typeof body.subject !== 'string') {
      errors.push({ field: 'subject', message: 'Subject is required and must be a string' });
    } else if (body.subject.trim().length === 0) {
      errors.push({ field: 'subject', message: 'Subject cannot be empty' });
    } else if (body.subject.length > 255) {
      errors.push({ field: 'subject', message: 'Subject must be less than 255 characters' });
    }

    // Validate description
    if (!body.description || typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Description is required and must be a string' });
    } else if (body.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description cannot be empty' });
    }

    // Validate status
    const validStatuses = ['InProgress', 'Done', 'Blocked'];
    if (!body.status || !validStatuses.includes(body.status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    // Validate isWfh
    if (body.isWfh !== undefined && typeof body.isWfh !== 'boolean') {
      errors.push({ field: 'isWfh', message: 'isWfh must be a boolean' });
    }

    // Validate teamId if isWfh is true
    if (body.isWfh && !body.teamId) {
      errors.push({ field: 'teamId', message: 'teamId is required when isWfh is true' });
    }

    // Validate time format (HH:MM)
    if (body.time) {
      const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(body.time)) {
        errors.push({ field: 'time', message: 'Time must be in HH:MM format (24-hour)' });
      }
    }

    // Validate project if provided
    if (body.project && typeof body.project !== 'string') {
      errors.push({ field: 'project', message: 'Project must be a string' });
    }

    return errors;
  }

  static validateTeamCreate(body: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!body.name || typeof body.name !== 'string') {
      errors.push({ field: 'name', message: 'Team name is required and must be a string' });
    } else if (body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Team name cannot be empty' });
    } else if (body.name.length > 100) {
      errors.push({ field: 'name', message: 'Team name must be less than 100 characters' });
    }

    if (body.description && typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    }

    if (body.wfhLimitPerMonth !== undefined) {
      if (typeof body.wfhLimitPerMonth !== 'number') {
        errors.push({ field: 'wfhLimitPerMonth', message: 'WFH limit must be a number' });
      } else if (body.wfhLimitPerMonth < 0 || body.wfhLimitPerMonth > 31) {
        errors.push({ field: 'wfhLimitPerMonth', message: 'WFH limit must be between 0 and 31' });
      }
    }

    return errors;
  }

  static validateLoginRequest(body: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!body.username || typeof body.username !== 'string') {
      errors.push({ field: 'username', message: 'Username is required and must be a string' });
    } else if (body.username.trim().length === 0) {
      errors.push({ field: 'username', message: 'Username cannot be empty' });
    }

    if (!body.password || typeof body.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required and must be a string' });
    } else if (body.password.length < 1) {
      errors.push({ field: 'password', message: 'Password cannot be empty' });
    }

    return errors;
  }
}
