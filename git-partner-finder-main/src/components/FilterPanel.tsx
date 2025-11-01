import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, X, Heart, Home } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SearchFilters } from '@/lib/github';
import { useFavorites } from '@/contexts/FavoritesContext';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onShowFavorites?: () => void;
  showingFavorites?: boolean;
  onGoHome?: () => void; // New prop for going home
}

const popularLanguages = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'R', 'Scala', 'HTML', 'CSS'
];

const experienceLevels = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' }
];

const sortOptions = [
  { value: 'followers', label: 'Followers' },
  { value: 'repositories', label: 'Repositories' },
  { value: 'joined', label: 'Recently Joined' }
];

const popularLocations = [
  'San Francisco, CA', 'New York, NY', 'London, UK', 'Berlin, Germany',
  'Toronto, Canada', 'Sydney, Australia', 'Tokyo, Japan', 'Singapore',
  'Amsterdam, Netherlands', 'Stockholm, Sweden'
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-md transition-colors">
        <span className="font-medium text-sm">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FilterPanel({ filters, onFiltersChange, onShowFavorites, showingFavorites, onGoHome }: FilterPanelProps) {
  const { favorites } = useFavorites();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(filters.language ? [filters.language] : []);
  const [selectedExperience, setSelectedExperience] = useState<string[]>(filters.experienceLevel ? [filters.experienceLevel] : []);

  const handleLanguageToggle = (language: string) => {
    const newLanguages = selectedLanguages.includes(language)
      ? selectedLanguages.filter(l => l !== language)
      : [...selectedLanguages, language];
    
    setSelectedLanguages(newLanguages);
    onFiltersChange({
      ...filters,
      language: newLanguages.length > 0 ? newLanguages[0] : undefined // For now, just use the first selected
    });
  };

  const handleExperienceToggle = (level: string) => {
    const newExperience = selectedExperience.includes(level)
      ? selectedExperience.filter(l => l !== level)
      : [...selectedExperience, level];
    
    setSelectedExperience(newExperience);
    onFiltersChange({
      ...filters,
      experienceLevel: newExperience.length > 0 ? newExperience[0] as 'junior' | 'mid' | 'senior' : undefined
    });
  };

  const clearFilters = () => {
    setSelectedLanguages([]);
    setSelectedExperience([]);
    onFiltersChange({
      query: filters.query,
      sortBy: 'followers',
      order: 'desc'
    });
  };

  const hasActiveFilters = filters.language || filters.location || filters.minRepos || filters.minFollowers || filters.experienceLevel;

  return (
    <Card className="w-80 h-fit border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h2 className="font-semibold">Filters</h2>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {/* Home Button */}
        {onGoHome && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGoHome}
            className="w-full mb-3"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        )}
        
        {/* Favorites Section */}
        {onShowFavorites && (
          <>
            <Button
              variant={showingFavorites ? "default" : "outline"}
              size="sm"
              onClick={onShowFavorites}
              className="w-full mb-3"
            >
              <Heart className={`h-4 w-4 mr-2 ${showingFavorites ? 'fill-current' : ''}`} />
              My Favorites ({favorites.length})
            </Button>
            <Separator className="mb-3" />
          </>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-0">
          {/* Programming Languages */}
          <FilterSection title="Programming Languages">
            <div className="space-y-2 mt-3">
              {popularLanguages.map((language) => (
                <div key={language} className="flex items-center space-x-2">
                  <Checkbox
                    id={`lang-${language}`}
                    checked={selectedLanguages.includes(language)}
                    onCheckedChange={() => handleLanguageToggle(language)}
                  />
                  <Label
                    htmlFor={`lang-${language}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {language}
                  </Label>
                </div>
              ))}
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Location */}
          <FilterSection title="Location">
            <div className="space-y-3 mt-3">
              <Input
                placeholder="Enter location..."
                value={filters.location || ''}
                onChange={(e) => 
                  onFiltersChange({ 
                    ...filters, 
                    location: e.target.value || undefined 
                  })
                }
                className="text-sm"
              />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Popular locations:</Label>
                <div className="flex flex-wrap gap-1">
                  {popularLocations.map((location) => (
                    <Badge
                      key={location}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-muted"
                      onClick={() => onFiltersChange({ ...filters, location })}
                    >
                      {location.split(',')[0]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Experience Level */}
          <FilterSection title="Experience Level">
            <div className="space-y-2 mt-3">
              {experienceLevels.map((level) => (
                <div key={level.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`exp-${level.value}`}
                    checked={selectedExperience.includes(level.value)}
                    onCheckedChange={() => handleExperienceToggle(level.value)}
                  />
                  <Label
                    htmlFor={`exp-${level.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {level.label}
                  </Label>
                </div>
              ))}
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Repository Count */}
          <FilterSection title="Repository Count">
            <div className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-sm">Minimum repositories</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={filters.minRepos || ''}
                  onChange={(e) => 
                    onFiltersChange({ 
                      ...filters, 
                      minRepos: e.target.value ? parseInt(e.target.value) : undefined 
                    })
                  }
                  className="text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[5, 10, 25, 50, 100].map((count) => (
                  <Badge
                    key={count}
                    variant={filters.minRepos === count ? "default" : "outline"}
                    className="text-xs cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, minRepos: count })}
                  >
                    {count}+
                  </Badge>
                ))}
              </div>
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Followers */}
          <FilterSection title="Followers">
            <div className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-sm">Minimum followers</Label>
                <Input
                  type="number"
                  placeholder="e.g., 50"
                  value={filters.minFollowers || ''}
                  onChange={(e) => 
                    onFiltersChange({ 
                      ...filters, 
                      minFollowers: e.target.value ? parseInt(e.target.value) : undefined 
                    })
                  }
                  className="text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[10, 50, 100, 500, 1000].map((count) => (
                  <Badge
                    key={count}
                    variant={filters.minFollowers === count ? "default" : "outline"}
                    className="text-xs cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, minFollowers: count })}
                  >
                    {count}+
                  </Badge>
                ))}
              </div>
            </div>
          </FilterSection>

          <Separator className="my-4" />

          {/* Sort Options */}
          <FilterSection title="Sort & Order">
            <div className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label className="text-sm">Sort by</Label>
                <Select
                  value={filters.sortBy || 'followers'}
                  onValueChange={(value) => 
                    onFiltersChange({ 
                      ...filters, 
                      sortBy: value as 'followers' | 'repositories' | 'joined'
                    })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Order</Label>
                <Select
                  value={filters.order || 'desc'}
                  onValueChange={(value) => 
                    onFiltersChange({ 
                      ...filters, 
                      order: value as 'asc' | 'desc'
                    })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Highest first</SelectItem>
                    <SelectItem value="asc">Lowest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterSection>
        </div>
      </ScrollArea>
    </Card>
  );
}