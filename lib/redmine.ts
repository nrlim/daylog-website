// ═══════════════════════════════════════════════════════════════════
// REDMINE SERVICE - Enhanced TypeScript Library
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface RedmineUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  mail: string;
  created_on: string;
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  created_on: string;
  updated_on: string;
}

export interface RedmineIssue {
  id: number;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
  author: { id: number; name: string };
  subject: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  done_ratio: number;
  estimated_hours?: number;
  created_on: string;
  updated_on: string;
}

export interface RedmineTimeEntry {
  id: number;
  project: { id: number; name: string };
  issue?: { id: number };
  user: { id: number; name: string };
  activity: { id: number; name: string };
  hours: number;
  comments?: string;
  spent_on: string;
  created_on: string;
  updated_on: string;
}

export interface RedmineError extends Error {
  status?: number;
  endpoint?: string;
  originalError?: any;
}

// ───────────────────────────────────────────────────────────────────
// CUSTOM ERROR CLASS
// ───────────────────────────────────────────────────────────────────

export class RedmineServiceError extends Error implements RedmineError {
  status?: number;
  endpoint?: string;
  originalError?: any;

  constructor(message: string, status?: number, endpoint?: string, originalError?: any) {
    super(message);
    this.name = 'RedmineServiceError';
    this.status = status;
    this.endpoint = endpoint;
    this.originalError = originalError;
  }
}

// ───────────────────────────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────────────────────────

interface RedmineServiceConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// MAIN SERVICE CLASS
// ───────────────────────────────────────────────────────────────────

export class RedmineService {
  private baseUrl: string;
  private authToken: string | null = null;
  private timeout: number;
  private retries: number;
  private debug: boolean;
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(config: RedmineServiceConfig, username?: string, password?: string) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.debug = config.debug || false;

    if (username && password) {
      this.setAuthToken(username, password);
    }

    this.log('🚀 RedmineService initialized', { baseUrl: this.baseUrl, debug: this.debug });
  }

  // ═══════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Set authentication token using username and password
   */
  public setAuthToken(username: string, password: string): void {
    if (!username || !password) {
      this.warn('setAuthToken called with empty credentials');
      return;
    }
    this.authToken = Buffer.from(`${username}:${password}`).toString('base64');
    this.log('✅ Auth token set for user:', username);
  }

  /**
   * Test authentication by getting current user
   */
  public async testConnection(): Promise<RedmineUser> {
    try {
      this.log('🔗 Testing Redmine connection...');
      const response = await this.fetchApi('/users/current.json');
      this.log('✅ Connection successful', response.user.login);
      return response.user;
    } catch (error) {
      this.error('❌ Connection test failed', error);
      throw new RedmineServiceError('Failed to connect to Redmine', undefined, '/users/current.json', error);
    }
  }

  /**
   * Get current authenticated user
   */
  public async getCurrentUser(): Promise<RedmineUser> {
    try {
      const response = await this.fetchApi('/users/current.json');
      return response.user;
    } catch (error) {
      throw this.handleError('Failed to get current user', error, '/users/current.json');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all projects with pagination
   */
  public async getProjects(params?: { limit?: number; offset?: number }): Promise<{
    projects: RedmineProject[];
    total_count: number;
  }> {
    try {
      const query = this.buildQuery(params);
      const response = await this.fetchApi(`/projects.json?${query}`);
      return response;
    } catch (error) {
      throw this.handleError('Failed to get projects', error, '/projects.json');
    }
  }

  /**
   * Get a single project by ID or identifier
   */
  public async getProject(projectId: string | number): Promise<RedmineProject> {
    try {
      const cacheKey = `project_${projectId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await this.fetchApi(
        `/projects/${projectId}.json?include=trackers,issue_categories`
      );
      this.setCache(cacheKey, response.project);
      return response.project;
    } catch (error) {
      throw this.handleError(`Failed to get project ${projectId}`, error, `/projects/${projectId}.json`);
    }
  }

  /**
   * Get issues for a specific project
   */
  public async getProjectIssues(
    projectId: string | number,
    options?: {
      statusId?: 'open' | 'closed' | '*';
      assignedToId?: string | number;
      offset?: number;
      limit?: number;
      sort?: string;
      include?: string[];
    }
  ): Promise<{ issues: RedmineIssue[]; total_count: number; offset: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      if (options?.statusId) params.append('status_id', options.statusId);
      if (options?.assignedToId) params.append('assigned_to_id', String(options.assignedToId));
      if (options?.offset !== undefined) params.append('offset', String(options.offset));
      if (options?.limit !== undefined) params.append('limit', String(options.limit));
      if (options?.sort) params.append('sort', options.sort);
      if (options?.include?.length) params.append('include', options.include.join(','));

      const response = await this.fetchApi(`/projects/${projectId}/issues.json?${params.toString()}`);
      return response;
    } catch (error) {
      throw this.handleError(`Failed to get issues for project ${projectId}`, error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ISSUES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all issues with advanced filtering
   */
  public async getIssues(params?: {
    project_id?: number | string;
    status_id?: 'open' | 'closed' | '*' | number;
    tracker_id?: number;
    assigned_to_id?: number | 'me';
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ issues: RedmineIssue[]; total_count: number; offset: number; limit: number }> {
    try {
      const query = new URLSearchParams();
      
      // Build filter parameters
      if (params?.project_id) {
        query.append('project_id', String(params.project_id));
      }
      if (params?.status_id) {
        query.append('status_id', String(params.status_id));
      }
      if (params?.tracker_id) {
        query.append('tracker_id', String(params.tracker_id));
      }
      if (params?.assigned_to_id) {
        query.append('assigned_to_id', String(params.assigned_to_id));
      }
      if (params?.limit) query.append('limit', String(params.limit));
      if (params?.offset) query.append('offset', String(params.offset));
      if (params?.sort) query.append('sort', params.sort);

      const response = await this.fetchApi(`/issues.json?${query.toString()}`);
      return response;
    } catch (error) {
      throw this.handleError('Failed to get issues', error, '/issues.json');
    }
  }

  /**
   * Get a single issue by ID
   */
  public async getIssue(id: number | string): Promise<RedmineIssue> {
    try {
      const cacheKey = `issue_${id}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await this.fetchApi(
        `/issues/${id}.json?include=journals,attachments,relations,changesets`
      );
      this.setCache(cacheKey, response.issue);
      return response.issue;
    } catch (error) {
      throw this.handleError(`Failed to get issue ${id}`, error, `/issues/${id}.json`);
    }
  }

  /**
   * Create a new issue
   */
  public async createIssue(issue: {
    project_id: number;
    tracker_id: number;
    status_id?: number;
    priority_id?: number;
    subject: string;
    description?: string;
    assigned_to_id?: number;
    parent_issue_id?: number;
    start_date?: string;
    due_date?: string;
    estimated_hours?: number;
    custom_fields?: Array<{ id: number; value: any }>;
  }): Promise<{ issue: RedmineIssue }> {
    try {
      this.log('📝 Creating issue:', issue.subject);
      const response = await this.fetchApi('/issues.json', {
        method: 'POST',
        body: JSON.stringify({ issue }),
      });
      this.log('✅ Issue created:', response.issue?.id);
      this.clearCache(); // Invalidate cache
      return response;
    } catch (error) {
      throw this.handleError('Failed to create issue', error, '/issues.json');
    }
  }

  /**
   * Update an existing issue
   */
  public async updateIssue(
    issueId: number,
    updates: {
      status_id?: number;
      priority_id?: number;
      subject?: string;
      description?: string;
      assigned_to_id?: number;
      due_date?: string;
      estimated_hours?: number;
      custom_fields?: Array<{ id: number; value: any }>;
    }
  ): Promise<void> {
    try {
      this.log('🔄 Updating issue:', issueId);
      await this.fetchApi(`/issues/${issueId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ issue: updates }),
      });
      this.log('✅ Issue updated:', issueId);
      this.clearCache(); // Invalidate cache
    } catch (error) {
      throw this.handleError(`Failed to update issue ${issueId}`, error, `/issues/${issueId}.json`);
    }
  }

  /**
   * Delete an issue
   */
  public async deleteIssue(issueId: number): Promise<void> {
    try {
      this.log('🗑️ Deleting issue:', issueId);
      await this.fetchApi(`/issues/${issueId}.json`, { method: 'DELETE' });
      this.log('✅ Issue deleted:', issueId);
      this.clearCache();
    } catch (error) {
      throw this.handleError(`Failed to delete issue ${issueId}`, error);
    }
  }

  /**
   * Move issue to a different status
   */
  public async moveIssue(
    projectId: number,
    issueId: number,
    statusId: number,
    position?: number
  ): Promise<void> {
    try {
      this.log('🔀 Moving issue:', issueId, 'to status:', statusId);
      const body: any = { status_id: statusId };
      if (position !== undefined) {
        body.position = position;
      }
      await this.fetchApi(`/issues/${issueId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ issue: body }),
      });
      this.log('✅ Issue moved successfully');
      this.clearCache();
    } catch (error) {
      throw this.handleError(`Failed to move issue ${issueId}`, error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIME ENTRIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get time entries with filtering
   */
  public async getTimeEntries(params?: {
    project_id?: number | string;
    issue_id?: number;
    user_id?: number | 'me';
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ time_entries: RedmineTimeEntry[]; total_count: number }> {
    try {
      const query = this.buildQuery(params);
      const response = await this.fetchApi(`/time_entries.json?${query}`);
      return response;
    } catch (error) {
      throw this.handleError('Failed to get time entries', error, '/time_entries.json');
    }
  }

  /**
   * Create a time entry
   */
  public async createTimeEntry(entry: {
    issue_id?: number;
    project_id: number;
    spent_on: string;
    hours: number;
    activity_id: number;
    comments?: string;
    custom_fields?: Array<{ id: number; value: any }>;
  }): Promise<void> {
    try {
      this.log('⏱️ Creating time entry:', entry.hours, 'hours');
      await this.fetchApi('/time_entries.json', {
        method: 'POST',
        body: JSON.stringify({ time_entry: entry }),
      });
      this.log('✅ Time entry created');
      this.clearCache();
    } catch (error) {
      throw this.handleError('Failed to create time entry', error, '/time_entries.json');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all users
   */
  public async getUsers(params?: { group_id?: number; status?: number }): Promise<{
    users: RedmineUser[];
    total_count: number;
  }> {
    try {
      const query = this.buildQuery(params);
      const response = await this.fetchApi(`/users.json?${query}`);
      return response;
    } catch (error) {
      throw this.handleError('Failed to get users', error, '/users.json');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get trackers (issue types)
   */
  public async getTrackers(): Promise<any> {
    try {
      const response = await this.fetchApi('/trackers.json');
      return response;
    } catch (error) {
      throw this.handleError('Failed to get trackers', error, '/trackers.json');
    }
  }

  /**
   * Get issue statuses
   */
  public async getIssueStatuses(): Promise<any> {
    try {
      const response = await this.fetchApi('/issue_statuses.json');
      return response;
    } catch (error) {
      throw this.handleError('Failed to get issue statuses', error, '/issue_statuses.json');
    }
  }

  /**
   * Get time entry activities
   */
  public async getTimeEntryActivities(): Promise<any> {
    try {
      const response = await this.fetchApi('/enumerations/time_entry_activities.json');
      return response;
    } catch (error) {
      throw this.handleError('Failed to get time entry activities', error);
    }
  }

  /**
   * Search Redmine
   */
  public async search(
    searchQuery: string,
    options?: {
      scope?: string;
      titles_only?: boolean;
      open_issues?: boolean;
      limit?: number;
    }
  ): Promise<any> {
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (options?.scope) params.append('scope', options.scope);
      if (options?.titles_only) params.append('titles_only', '1');
      if (options?.open_issues) params.append('open_issues', '1');
      if (options?.limit) params.append('limit', String(options.limit));

      const response = await this.fetchApi(`/search.json?${params.toString()}`);
      return response;
    } catch (error) {
      throw this.handleError('Failed to search', error, '/search.json');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Core fetch method with retry logic
   */
  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.authToken) {
      throw new RedmineServiceError('Not authenticated - please set auth token first');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let lastError: any;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        this.log(`📤 [${options.method || 'GET'}] ${endpoint} (attempt ${attempt}/${this.retries})`);

        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Basic ${this.authToken}`);
        headers.set('Content-Type', 'application/json');

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);

        // Handle different status codes
        if (!response.ok) {
          const data = await response.text();
          this.error(`❌ Status ${response.status}:`, data);

          if (response.status === 401 || response.status === 403) {
            throw new RedmineServiceError(
              'Authentication failed - Invalid credentials',
              response.status,
              endpoint
            );
          }

          if (response.status === 404) {
            throw new RedmineServiceError('Resource not found', response.status, endpoint);
          }

          // Retry on 5xx errors
          if (response.status >= 500 && attempt < this.retries) {
            this.warn(`Server error ${response.status}, retrying...`);
            await this.delay(1000 * attempt); // Exponential backoff
            continue;
          }

          throw new RedmineServiceError(`HTTP ${response.status}`, response.status, endpoint);
        }

        const responseText = await response.text();
        if (!responseText) {
          this.log(`✅ ${response.status} - No content`);
          return {};
        }

        const data = JSON.parse(responseText);
        this.log(`✅ ${response.status} - Success`);
        return data;
      } catch (error: any) {
        lastError = error;

        if (error.name === 'AbortError') {
          clearTimeout(timeoutId);
          throw new RedmineServiceError(`Request timeout after ${this.timeout}ms`, undefined, endpoint, error);
        }

        if (error instanceof RedmineServiceError) {
          throw error;
        }

        if (attempt < this.retries) {
          this.warn(`Attempt ${attempt} failed, retrying...`);
          await this.delay(1000 * attempt);
        }
      }
    }

    clearTimeout(timeoutId);
    throw new RedmineServiceError('All retry attempts failed', undefined, endpoint, lastError);
  }

  /**
   * Build query string from parameters
   */
  private buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return query.toString();
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.log(`💾 Cache hit for ${key}`);
      return cached.data;
    }
    this.requestCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.requestCache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Error handling
   */
  private handleError(message: string, error: any, endpoint?: string): RedmineServiceError {
    this.error(message, error);
    if (error instanceof RedmineServiceError) {
      return error;
    }
    return new RedmineServiceError(message, undefined, endpoint, error);
  }

  /**
   * Utility: delay function for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[Redmine]', ...args);
    }
  }

  private warn(...args: any[]): void {
    console.warn('[Redmine]', ...args);
  }

  private error(...args: any[]): void {
    console.error('[Redmine]', ...args);
  }
}
