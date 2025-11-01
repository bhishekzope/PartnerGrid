import { useState, useEffect } from 'react';
import { MapPin, Calendar, GitBranch, Users, Star, ExternalLink, Code2, Building, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { githubAPI, analyzeLanguageStats } from '@/lib/github';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { GitHubUser, GitHubRepo } from '@/lib/github';

interface UserCardProps {
  user: GitHubUser;
}

export function UserCard({ user }: UserCardProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [languageStats, setLanguageStats] = useState<Array<{
    language: string;
    percentage: number;
    bytes: number;
  }>>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const joinedDate = new Date(user.created_at).toLocaleDateString();

  const loadUserDetails = async () => {
    if (detailsLoaded || isLoadingDetails) return;
    
    setIsLoadingDetails(true);
    try {
      // Fetch user's repositories
      const userRepos = await githubAPI.getUserRepos(user.login, 1, 50);
      setRepos(userRepos);

      // Analyze language statistics from repositories
      const languageCounts: Record<string, number> = {};
      
      for (const repo of userRepos.slice(0, 20)) { // Limit to avoid rate limits
        if (repo.language) {
          languageCounts[repo.language] = (languageCounts[repo.language] || 0) + repo.size;
        }
      }

      const stats = analyzeLanguageStats(languageCounts);
      setLanguageStats(stats.slice(0, 5)); // Top 5 languages
      setDetailsLoaded(true);
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    // Auto-load details with a slight delay to avoid immediate API calls
    const timer = setTimeout(loadUserDetails, 500);
    return () => clearTimeout(timer);
  }, [user.login]);

  return (
    <Card className="group hover:shadow-glow transition-smooth cursor-pointer">
      <CardHeader className="space-y-4">
        {/* User Avatar and Basic Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={user.avatar_url} alt={user.name || user.login} />
            <AvatarFallback>{(user.name || user.login).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">
                {user.name || user.login}
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-1">@{user.login}</p>
            
            {user.bio && (
              <p className="text-sm text-foreground line-clamp-2 mb-3">
                {user.bio}
              </p>
            )}

            {/* GitHub Stats Row - Compact Display */}
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1 min-w-0">
                <GitBranch className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate">{user.public_repos}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <Users className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate">{user.followers}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <Star className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate">{user.following}</span>
              </div>
            </div>

            {/* Location and Company */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {user.location}
                </div>
              )}
              {user.company && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {user.company}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined {joinedDate}
              </div>
            </div>
          </div>
          
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(user);
            }}
            className="shrink-0"
          >
            <Heart 
              className={`h-4 w-4 ${
                isFavorite(user.id) 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-muted-foreground hover:text-red-500'
              }`} 
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Language Stats */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Top Languages</span>
          </div>
          
          {isLoadingDetails && !detailsLoaded ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-2 flex-1" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : languageStats.length > 0 ? (
            <div className="space-y-2">
              {languageStats.map((lang) => (
                <div key={lang.language} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {lang.language}
                  </Badge>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {lang.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : detailsLoaded ? (
            <p className="text-sm text-muted-foreground">No language data available</p>
          ) : null}
        </div>

        {/* Recent Repositories */}
        {repos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Repositories</h4>
            <div className="space-y-2">
              {repos.slice(0, 3).map((repo) => (
                <div key={repo.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{repo.name}</span>
                    {repo.language && (
                      <Badge variant="secondary" className="text-xs">
                        {repo.language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                    <Star className="h-3 w-3" />
                    {repo.stargazers_count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-smooth"
          onClick={() => window.open(user.html_url, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View GitHub Profile
        </Button>
      </CardContent>
    </Card>
  );
}