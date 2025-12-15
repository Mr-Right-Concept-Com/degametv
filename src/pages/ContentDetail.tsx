import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContentRow } from '@/components/content/ContentRow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Share2, Star, Clock, Calendar, Download, Heart } from 'lucide-react';
import { mockMovies, mockSeries } from '@/data/mockData';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  
  const content = [...mockMovies, ...mockSeries].find((c) => c.id === id);
  
  if (!content) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const relatedContent = mockMovies
    .filter((m) => m.id !== id && m.genres?.some((g) => content.genres?.includes(g)))
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      title: m.title,
      thumbnail: m.thumbnail_url,
      type: 'movie' as const,
      rating: m.rating,
      duration: m.duration,
      year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
      genre: m.genres?.[0],
    }));

  return (
    <MainLayout>
      {/* Hero Banner */}
      <div className="relative h-[60vh] md:h-[70vh]">
        <img
          src={content.banner_url || content.thumbnail_url}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content Info */}
      <div className="container mx-auto px-4 -mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-48 md:w-64 rounded-xl shadow-2xl"
            />
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {content.rating && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400" />
                  {content.rating.toFixed(1)}
                </Badge>
              )}
              <Badge variant="outline">{content.type}</Badge>
              {content.monetization !== 'free' && (
                <Badge className="bg-accent/20 text-accent border-accent/50">
                  {content.monetization.toUpperCase()}
                </Badge>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {content.title}
            </h1>

            <div className="flex items-center gap-4 text-muted-foreground mb-4">
              {content.release_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(content.release_date).getFullYear()}
                </span>
              )}
              {content.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(content.duration / 60)}h {content.duration % 60}m
                </span>
              )}
            </div>

            {/* Genres */}
            {content.genres && (
              <div className="flex items-center gap-2 mb-6">
                {content.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
              {content.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mb-8">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 gap-2">
                <Play className="w-5 h-5 fill-white" />
                Watch Now
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <Plus className="w-5 h-5" />
                Add to List
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Download className="w-5 h-5" />
              </Button>
            </div>

            {/* Cast & Crew */}
            {content.cast_crew && Array.isArray(content.cast_crew) && content.cast_crew.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold mb-3">Cast & Crew</h3>
                <div className="flex flex-wrap gap-2">
                  {(content.cast_crew as string[]).slice(0, 6).map((person, i) => (
                    <Badge key={i} variant="outline">
                      {person}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Content */}
      {relatedContent.length > 0 && (
        <ContentRow
          title="You Might Also Like"
          items={relatedContent}
          className="mt-12"
        />
      )}
    </MainLayout>
  );
}
