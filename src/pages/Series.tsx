import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContentCard } from '@/components/content/ContentCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Grid, List, SlidersHorizontal } from 'lucide-react';
import { mockSeries } from '@/data/mockData';

const genres = ['All', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Fantasy', 'Crime', 'Documentary'];

export default function Series() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredSeries = mockSeries.filter((series) => {
    const matchesSearch = series.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || series.genres?.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  const sortedSeries = [...filteredSeries].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'newest':
        return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return (b.viewCount || 0) - (a.viewCount || 0);
    }
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">Series</h1>
          <p className="text-muted-foreground">
            Binge-worthy shows and series
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {genres.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenre === genre ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Sort & View Controls */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing {sortedSeries.length} results
          </p>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="title">A-Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
              : 'flex flex-col gap-4'
          }
        >
          {sortedSeries.map((series) => (
            <ContentCard
              key={series.id}
              id={series.id}
              title={series.title}
              thumbnail={series.thumbnailUrl}
              type="series"
              rating={series.rating}
              genre={series.genres?.[0]}
            />
          ))}
        </div>

        {sortedSeries.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No series found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
