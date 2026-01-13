
import { NextResponse } from 'next/server';

/**
 * Extract project path and SHA from GitLab commit URL
 * Example: https://oktapod.quadrant-si.id/zurich/mzpro/backend/qsi.mzpro.web.api/-/commit/e7ab46dc
 * Returns: { projectPath: 'zurich/mzpro/backend/qsi.mzpro.web.api', sha: 'e7ab46dc' }
 */
function extractFromGitLabUrl(url: string): { projectPath: string; sha: string } | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Match: /project/path/-/commit/sha
        const match = pathname.match(/^\/(.+?)\/-\/commit\/([a-f0-9]+)/i);

        if (match) {
            return {
                projectPath: match[1],  // e.g., "zurich/mzpro/backend/qsi.mzpro.web.api"
                sha: match[2]
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get('sha');

    if (!input) {
        return NextResponse.json({ error: 'Commit SHA or URL is required' }, { status: 400 });
    }

    // Validate configuration
    const gitlabToken = process.env.GITLAB_ACCESS_TOKEN;
    const gitlabBaseUrl = process.env.NEXT_PUBLIC_GITLAB_BASE_URL;

    if (!gitlabToken) {
        return NextResponse.json({
            error: 'GitLab Access Token not configured. Add GITLAB_ACCESS_TOKEN to .env'
        }, { status: 500 });
    }

    if (!gitlabBaseUrl) {
        return NextResponse.json({
            error: 'GitLab Base URL not configured. Add NEXT_PUBLIC_GITLAB_BASE_URL to .env'
        }, { status: 500 });
    }

    // Extract API domain from base URL
    let apiDomain: string;
    try {
        const urlObj = new URL(gitlabBaseUrl);
        apiDomain = urlObj.origin;
    } catch (e) {
        return NextResponse.json({
            error: `Invalid NEXT_PUBLIC_GITLAB_BASE_URL: ${gitlabBaseUrl}`
        }, { status: 500 });
    }

    // Try to extract project and SHA from URL
    let projectPath: string | undefined;
    let sha: string;

    if (input.startsWith('http')) {
        const extracted = extractFromGitLabUrl(input);

        if (extracted) {
            projectPath = extracted.projectPath;
            sha = extracted.sha;
        } else {
            return NextResponse.json({
                error: 'Could not parse GitLab URL. Expected format: https://your-gitlab.com/project/path/-/commit/sha'
            }, { status: 400 });
        }
    } else {
        // Plain SHA provided - use default project from env
        sha = input;
        projectPath = process.env.GITLAB_PROJECT_ID;
    }

    if (!projectPath) {
        return NextResponse.json({
            error: 'Project could not be determined. Either paste a full GitLab URL or configure GITLAB_PROJECT_ID in .env for your main project.'
        }, { status: 400 });
    }

    // Construct GitLab API URL
    const apiUrl = `${apiDomain}/api/v4/projects/${encodeURIComponent(projectPath)}/repository/commits/${sha}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'PRIVATE-TOKEN': gitlabToken,
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({
                    error: `Commit not found in project "${projectPath}"`
                }, { status: 404 });
            }
            if (response.status === 401 || response.status === 403) {
                return NextResponse.json({
                    error: 'Access denied. Check if your GitLab token has access to this project.'
                }, { status: response.status });
            }
            return NextResponse.json({
                error: `GitLab API error (${response.status})`
            }, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({
            short_id: data.short_id,
            title: data.title,
            message: data.message,
            author_name: data.author_name,
            created_at: data.created_at,
            web_url: data.web_url,
            project_path: projectPath,
        });

    } catch (error: any) {
        return NextResponse.json({
            error: `Internal error: ${error.message}`
        }, { status: 500 });
    }
}
