import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContentCard } from '@/components/content/ContentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Grid, List, SlidersHorizontal, Film } from 'lucide-react';
import { mockMovies } from '@/data/mockData';

const genres = ['All', 'Drama', 'Comedy', 'Romance', 'Action', 'Thriller', 'Cultural', 'Family', 'Historical'];

export default function Movies() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredMovies = mockMovies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || movie.genres?.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  const sortedMovies = [...filteredMovies].sort((a, b) => {
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 rounded-full bg-accent" />
            <h1 className="text-4xl font-display font-bold">Nollywood Movies</h1>
          </div>
          <p className="text-muted-foreground ml-5">
            Explore our collection of {mockMovies.length}+ African films
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Genre Filter */}
          <div className="flex gap-2 flex-wrap">
            {genres.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenre === genre ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${
                  selectedGenre === genre 
                    ? 'bg-accent text-background hover:bg-accent/90' 
                    : 'hover:bg-accent/20 hover:border-accent'
                }`}
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
            Showing {sortedMovies.length} results
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
                className={viewMode === 'grid' ? 'bg-accent text-background' : ''}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-accent text-background' : ''}
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
          {sortedMovies.map((movie) => (
            <ContentCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              thumbnail={movie.thumbnailUrl}
              type="movie"
              rating={movie.rating}
              duration={movie.duration}
              year={movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined}
              genre={movie.genres?.[0]}
            />
          ))}
        </div>

        {/* Empty State */}
        {sortedMovies.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Film className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No movies found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
