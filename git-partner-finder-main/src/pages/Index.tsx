import { useState, useCallback, useEffect } from 'react';
import { AlertCircle, Zap, Github, Users, Search, LogOut, User, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FilterPanel } from '@/components/FilterPanel';
import { UserCard } from '@/components/UserCard';
import { githubAPI, calculateExperienceLevel } from '@/lib/github';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { GitHubUser, SearchFilters, RateLimitInfo } from '@/lib/github';

const Index = () => {
  const [allUsers, setAllUsers] = useState<GitHubUser[]>([]); // Store all fetched users
  const [filteredUsers, setFilteredUsers] = useState<GitHubUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number | undefined>();
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [showingFavorites, setShowingFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState(''); // Track last API search
  const [isOnHomePage, setIsOnHomePage] = useState(true); // Track if we're on home page
  
  const { toast } = useToast();
  const { user: authUser, logout } = useAuth();
  const { favorites } = useFavorites();

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'followers',
    order: 'desc'
  });

  // Load rate limit info on component mount and fetch initial users
  useEffect(() => {
    const rateLimitInfo = githubAPI.getRateLimit();
    setRateLimit(rateLimitInfo);
    
    // Set the authenticated user's token for API calls
    if (authUser) {
      const token = localStorage.getItem('github_token');
      if (token) {
        githubAPI.setToken(token);
      }
    }
    
    // Fetch popular developers on startup
    if (authUser) {
      fetchInitialUsers();
    }
  }, [authUser]);

  // When filters change, trigger new search with those filters (with debounce)
  useEffect(() => {
    if (showingFavorites) {
      setFilteredUsers(favorites);
      return;
    }

    // Debounce filter changes to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      if (filters.language || filters.location || filters.minRepos || filters.minFollowers || filters.experienceLevel) {
        performFilteredSearch();
      } else {
        // No filters, just apply client-side sorting to existing users
        applyClientSideFilters();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters, showingFavorites, favorites]);

  const updateRateLimit = useCallback(() => {
    const rateLimitInfo = githubAPI.getRateLimit();
    setRateLimit(rateLimitInfo);
  }, []);

  // Client-side filtering to avoid excessive API calls
  const applyClientSideFilters = useCallback(() => {
    let filtered = [...allUsers];

    // Apply language filter
    if (filters.language) {
      filtered = filtered.filter(user => {
        const bio = user.bio?.toLowerCase() || '';
        const login = user.login.toLowerCase();
        const language = filters.language!.toLowerCase();
        return bio.includes(language) || login.includes(language);
      });
    }

    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter(user => 
        user.location?.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    // Apply minimum repositories filter
    if (filters.minRepos) {
      filtered = filtered.filter(user => user.public_repos >= filters.minRepos!);
    }

    // Apply minimum followers filter
    if (filters.minFollowers) {
      filtered = filtered.filter(user => user.followers >= filters.minFollowers!);
    }

    // Apply experience level filter
    if (filters.experienceLevel) {
      filtered = filtered.filter(user => {
        const userExperience = calculateExperienceLevel(user.created_at, user.public_repos);
        return userExperience === filters.experienceLevel;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: number, valueB: number;
      
      switch (filters.sortBy) {
        case 'repositories':
          valueA = a.public_repos;
          valueB = b.public_repos;
          break;
        case 'joined':
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
          break;
        case 'followers':
        default:
          valueA = a.followers;
          valueB = b.followers;
          break;
      }
      
      return filters.order === 'desc' ? valueB - valueA : valueA - valueB;
    });

    setFilteredUsers(filtered);
  }, [allUsers, filters]);

  const fetchInitialUsers = async () => {
    setIsLoading(true);
    setError(null);
    setIsOnHomePage(true); // We're going to home page

    try {
      // Make sure we have the token set
      const token = localStorage.getItem('github_token');
      if (token) {
        githubAPI.setToken(token);
      }
      
      // Fetch popular JavaScript developers to start with
      const result = await githubAPI.searchUsers({
        query: 'javascript',
        sortBy: 'followers',
        order: 'desc'
      }, 1, 50);
      
      setAllUsers(result.users);
      setFilteredUsers(result.users); // Ensure filtered users are set for immediate display
      setTotalResults(result.total_count);
      setLastSearchQuery('javascript');
      updateRateLimit();

      toast({
        title: "Welcome!",
        description: `Found ${result.users.length} popular developers. Use filters to refine results.`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch initial users';
      setError(errorMessage);
      
      toast({
        title: "Failed to load users",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performFilteredSearch = async () => {
    if (!authUser) return;
    
    setIsLoading(true);
    setError(null);
    setIsOnHomePage(false); // We're leaving home page

    try {
      // Make sure we have the token set
      const token = localStorage.getItem('github_token');
      if (token) {
        githubAPI.setToken(token);
      }
      
      // Build search query based on filters
      let searchQuery = '';
      
      // Use the selected language as the main search term, or default to a broad search
      if (filters.language) {
        searchQuery = filters.language.toLowerCase();
      } else {
        searchQuery = 'followers:>10'; // Broad search for active developers
      }
      
      // Create filter object for GitHub API
      const searchFilters: SearchFilters = {
        query: searchQuery,
        language: filters.language,
        location: filters.location,
        minRepos: filters.minRepos,
        minFollowers: filters.minFollowers,
        sortBy: filters.sortBy || 'followers',
        order: filters.order || 'desc'
      };
      
      const result = await githubAPI.searchUsers(searchFilters, 1, 50);
      
      setAllUsers(result.users);
      setFilteredUsers(result.users); // Directly set filtered users to show results immediately
      setTotalResults(result.total_count);
      setLastSearchQuery(searchQuery);
      updateRateLimit();

      if (result.users.length === 0) {
        toast({
          title: "No developers found",
          description: "Try adjusting your filter criteria or search for a different technology.",
        });
      } else {
        toast({
          title: "Filters applied!",
          description: `Found ${result.users.length} developers matching your criteria.`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
      setError(errorMessage);
      
      if (errorMessage.includes('Rate limit exceeded')) {
        toast({
          title: "Rate limit exceeded",
          description: "Please try again later or reduce filter frequency.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = useCallback(async (page = 1, append = false) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search term to find developers.",
        variant: "destructive"
      });
      return;
    }

    const query = searchQuery.trim();
    setIsLoading(true);
    setError(null);
    setLastSearchQuery(query); // Track the search query used
    setIsOnHomePage(false); // We're leaving home page

    try {
      // Make sure we have the token set
      const token = localStorage.getItem('github_token');
      if (token) {
        githubAPI.setToken(token);
      }
      
      // For search, use the search query directly without too many filters to avoid rate limiting
      const searchFilters: SearchFilters = {
        query,
        sortBy: filters.sortBy || 'followers',
        order: filters.order || 'desc'
      };
      
      const result = await githubAPI.searchUsers(searchFilters, page, 50);
      
      if (append) {
        setAllUsers(prev => [...prev, ...result.users]);
        setFilteredUsers(prev => [...prev, ...result.users]);
      } else {
        setAllUsers(result.users);
        setFilteredUsers(result.users);
        setCurrentPage(1);
      }
      
      setTotalResults(result.total_count);
      setHasMoreResults(result.users.length === 50 && (page * 50) < Math.min(result.total_count, 1000));
      
      updateRateLimit();

      if (result.users.length === 0 && page === 1) {
        toast({
          title: "No developers found",
          description: "Try a different search term.",
        });
      } else {
        toast({
          title: "Search completed",
          description: `Found ${result.users.length} developers. Use filters on the left to refine results.`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
      setError(errorMessage);
      
      if (errorMessage.includes('Rate limit exceeded')) {
        toast({
          title: "Rate limit exceeded",
          description: "Your GitHub API rate limit has been exceeded. Try again later.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters.sortBy, filters.order, toast, updateRateLimit]);

  const loadMoreResults = useCallback(() => {
    if (!hasMoreResults || isLoading) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    searchUsers(nextPage, true);
  }, [hasMoreResults, isLoading, currentPage, searchUsers]);

  const handleShowFavorites = () => {
    setShowingFavorites(!showingFavorites);
    setIsOnHomePage(false); // We're leaving home page when showing favorites
  };

  const handleGoHome = () => {
    // Clear all filters and return to initial state
    setFilters({
      query: '',
      sortBy: 'followers',
      order: 'desc'
    });
    setShowingFavorites(false);
    setSearchQuery('');
    
    // Always reload the initial JavaScript developers
    fetchInitialUsers();
    
    toast({
      title: "Back to Home",
      description: "Showing popular JavaScript developers.",
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowingFavorites(false);
    setIsOnHomePage(false); // We're leaving home page when searching
    searchUsers();
  };

  const isRateLimitLow = rateLimit && rateLimit.remaining < 10;
  const displayUsers = showingFavorites ? favorites : filteredUsers;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Filters */}
      <div className="hidden lg:block w-80 border-r border-border">
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onShowFavorites={handleShowFavorites}
          showingFavorites={showingFavorites}
          onGoHome={!isOnHomePage ? handleGoHome : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-background border-b border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">PartnerGrid</h1>
                <p className="text-sm text-muted-foreground">Connecting Developers</p>
              </div>
            </div>
            
            {/* User Profile & Logout */}
            <div className="flex items-center gap-3">
              {rateLimit && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  {rateLimit.remaining} API calls
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={authUser?.avatar_url} alt={authUser?.name || authUser?.login} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{authUser?.name || authUser?.login}</span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search developers by username, name, or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
        </header>

        {/* Rate Limit Warning */}
        {isRateLimitLow && (
          <div className="p-4">
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                API rate limit is low ({rateLimit?.remaining} remaining). 
                Consider using a GitHub personal access token for higher limits.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Results Section */}
        <div className="flex-1 p-4">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {showingFavorites ? 'My Favorites' : 'Developers'}
              </h2>
              {showingFavorites ? (
                <Badge variant="secondary">
                  {favorites.length} favorites
                </Badge>
              ) : (
                <>
                  {totalResults !== undefined && (
                    <Badge variant="secondary">
                      {displayUsers.length} of {totalResults.toLocaleString()} found
                    </Badge>
                  )}
                  {/* Active Filters Indicator */}
                  {(filters.language || filters.location || filters.minRepos || filters.minFollowers || filters.experienceLevel) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Filter className="h-3 w-3 mr-1" />
                      Filters Active
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* User Grid */}
          {displayUsers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {displayUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>

              {/* Load More Button */}
              {!showingFavorites && hasMoreResults && (
                <div className="text-center mt-8">
                  <Button
                    onClick={loadMoreResults}
                    disabled={isLoading}
                    size="lg"
                    variant="outline"
                    className="px-8"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
                        Loading more...
                      </>
                    ) : (
                      'Load More Developers'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Github className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {showingFavorites ? 'No favorites yet' : 'No developers found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {showingFavorites 
                    ? 'Start favoriting developers to see them here.' 
                    : 'Try adjusting your search criteria or filters.'}
                </p>
                {showingFavorites ? (
                  <Button onClick={() => setShowingFavorites(false)}>
                    Browse developers
                  </Button>
                ) : (
                  <Button onClick={() => setSearchQuery('javascript')}>
                    Search for JavaScript developers
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;