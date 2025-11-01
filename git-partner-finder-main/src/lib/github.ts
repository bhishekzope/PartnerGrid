// GitHub API integration with caching and rate limit management

const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_KEY = 'github_rate_limit';
const CACHE_PREFIX = 'github_cache_';

interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  size: number;
}

interface SearchFilters {
  query: string;
  language?: string;
  location?: string;
  minRepos?: number;
  minFollowers?: number;
  sortBy?: 'followers' | 'repositories' | 'joined';
  order?: 'asc' | 'desc';
  experienceLevel?: 'junior' | 'mid' | 'senior';
}

class GitHubAPI {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }

  private getCacheKey(url: string): string {
    return `${CACHE_PREFIX}${btoa(url)}`;
  }

  private getCachedData<T>(cacheKey: string): T | null {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  private setCachedData<T>(cacheKey: string, data: T): void {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const total = headers.get('x-ratelimit-limit');

    if (remaining && reset && total) {
      const rateLimitInfo: RateLimitInfo = {
        remaining: parseInt(remaining),
        reset: parseInt(reset) * 1000, 
        total: parseInt(total)
      };

      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rateLimitInfo));
    }
  }

  getRateLimit(): RateLimitInfo | null {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async fetchWithCache<T>(url: string): Promise<T> {
    const cacheKey = this.getCacheKey(url);
    const cached = this.getCachedData<T>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    this.updateRateLimit(response.headers);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Rate limit exceeded. Please try again later or add a GitHub token.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.setCachedData(cacheKey, data);

    return data;
  }

  async searchUsers(filters: SearchFilters, page = 1, perPage = 30): Promise<{
    users: GitHubUser[];
    total_count: number;
    incomplete_results: boolean;
  }> {
    let query = filters.query;

    // Build GitHub search query
    if (filters.language) {
      query += ` language:${filters.language}`;
    }
    if (filters.location) {
      query += ` location:"${filters.location}"`;
    }
    if (filters.minRepos) {
      query += ` repos:>=${filters.minRepos}`;
    }
    if (filters.minFollowers) {
      query += ` followers:>=${filters.minFollowers}`;
    }

    // Add type filter to only get users
    query += ' type:user';

    const params = new URLSearchParams({
      q: query,
      sort: filters.sortBy || 'followers',
      order: filters.order || 'desc',
      page: page.toString(),
      per_page: perPage.toString()
    });

    const url = `${GITHUB_API_BASE}/search/users?${params}`;
    const result = await this.fetchWithCache<{
      items: GitHubUser[];
      total_count: number;
      incomplete_results: boolean;
    }>(url);

    return {
      users: result.items,
      total_count: result.total_count,
      incomplete_results: result.incomplete_results
    };
  }

  async getUser(username: string): Promise<GitHubUser> {
    const url = `${GITHUB_API_BASE}/users/${username}`;
    return this.fetchWithCache<GitHubUser>(url);
  }

  async getUserRepos(username: string, page = 1, perPage = 100): Promise<GitHubRepo[]> {
    const params = new URLSearchParams({
      sort: 'updated',
      direction: 'desc',
      page: page.toString(),
      per_page: perPage.toString()
    });

    const url = `${GITHUB_API_BASE}/users/${username}/repos?${params}`;
    return this.fetchWithCache<GitHubRepo[]>(url);
  }

  async getRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`;
    return this.fetchWithCache<Record<string, number>>(url);
  }

  setToken(token: string): void {
    this.token = token;
  }
}

// Utility functions for data analysis
export function calculateExperienceLevel(createdAt: string, publicRepos: number): 'junior' | 'mid' | 'senior' {
  const accountAge = Date.now() - new Date(createdAt).getTime();
  const yearsActive = accountAge / (1000 * 60 * 60 * 24 * 365);

  // More balanced distribution to ensure variety
  
  // Junior: New or less active developers
  if (yearsActive <= 2.5 || publicRepos <= 15) {
    return 'junior';
  }
  
  // Senior: Experienced or highly productive developers  
  if (yearsActive >= 5 || publicRepos >= 60) {
    return 'senior';
  }
  
  // Mid: Everyone else
  return 'mid';
}

export function analyzeLanguageStats(languages: Record<string, number>): Array<{
  language: string;
  percentage: number;
  bytes: number;
}> {
  const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  
  return Object.entries(languages)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: Math.round((bytes / total) * 100)
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

export function getComplementarySkills(primaryLanguage: string): string[] {
  const complementaryMap: Record<string, string[]> = {
    'JavaScript': ['Python', 'Java', 'Go', 'Rust'],
    'TypeScript': ['Python', 'Java', 'Go', 'Rust'],
    'Python': ['JavaScript', 'TypeScript', 'Go', 'Rust'],
    'Java': ['JavaScript', 'TypeScript', 'Python', 'Kotlin'],
    'Go': ['JavaScript', 'TypeScript', 'Python', 'Rust'],
    'Rust': ['JavaScript', 'TypeScript', 'Python', 'Go'],
    'React': ['Node.js', 'Express', 'GraphQL', 'PostgreSQL'],
    'Vue': ['Node.js', 'Express', 'Laravel', 'MongoDB'],
    'Angular': ['Node.js', 'Spring Boot', 'ASP.NET', 'PostgreSQL'],
  };

  return complementaryMap[primaryLanguage] || [];
}

export const githubAPI = new GitHubAPI();

export type { GitHubUser, GitHubRepo, SearchFilters, RateLimitInfo };