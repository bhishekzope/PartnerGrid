import { useState } from 'react';
import { Search, Settings, Users, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterPanel } from './FilterPanel';
import type { SearchFilters } from '@/lib/github';

interface SearchHeaderProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading: boolean;
  totalResults?: number;
  rateLimit?: {
    remaining: number;
    total: number;
    reset: number;
  } | null;
}

export function SearchHeader({
  filters,
  onFiltersChange,
  onSearch,
  isLoading,
  totalResults,
  rateLimit
}: SearchHeaderProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-lg gradient-primary shadow-glow">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
            DevPartner
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find your perfect coding partner by searching real GitHub profiles.
          Connect with developers based on skills, experience, and location.
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-6 shadow-card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search developers by username, name, or bio..."
                value={filters.query}
                onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setShowFilters(!showFilters)}
              className="px-6"
            >
              <Settings className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !filters.query.trim()}
              className="px-8 gradient-primary hover:opacity-90 transition-smooth"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Searching...
                </div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          )}
        </form>

        {/* Search Stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            {totalResults !== undefined && (
              <Badge variant="secondary" className="text-sm">
                {totalResults.toLocaleString()} developers found
              </Badge>
            )}
            
            {/* Active Filters */}
            <div className="flex items-center gap-2">
              {filters.language && (
                <Badge variant="outline">
                  Language: {filters.language}
                </Badge>
              )}
              {filters.location && (
                <Badge variant="outline">
                  Location: {filters.location}
                </Badge>
              )}
              {filters.minRepos && (
                <Badge variant="outline">
                  Min repos: {filters.minRepos}
                </Badge>
              )}
              {filters.minFollowers && (
                <Badge variant="outline">
                  Min followers: {filters.minFollowers}
                </Badge>
              )}
            </div>
          </div>

          {/* Rate Limit Info */}
          {rateLimit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>
                {rateLimit.remaining}/{rateLimit.total} API calls remaining
              </span>
              {rateLimit.remaining < 10 && (
                <Badge variant="destructive" className="text-xs">
                  Low
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}