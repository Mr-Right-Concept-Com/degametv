import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Share2, Star, Clock, Calendar, Heart, Ticket } from 'lucide-react';
import { mockMovies, mockSeries } from '@/data/mockData';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  
  const content = [...mockMovies, ...mockSeries].find((c) => c.id === id);
  
  if (!content) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <Button asChild className="gradient-primary">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isPremiere = content.monetization === 'ticket';

  // Get cast from castCrew if available
  const cast = content.castCrew && Array.isArray(content.castCrew) ? content.castCrew : [];

  return (
    <MainLayout>
      {/* Hero Banner */}
      <div className="relative h-[60vh] md:h-[70vh]">
        <img
          src={content.bannerUrl || content.thumbnailUrl}
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
            <div className="relative">
              <img
                src={content.thumbnailUrl}
                alt={content.title}
                className="w-48 md:w-64 rounded-xl shadow-2xl border border-border/30"
              />
              {isPremiere && (
                <Badge className="absolute -top-2 -right-2 premiere-badge text-background border-0">
                  <Ticket className="w-3 h-3 mr-1" />
                  PREMIERE
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {content.rating && content.rating > 0 && (
                <Badge className="bg-accent/20 text-accent border-accent/50">
                  <Star className="w-3 h-3 mr-1 fill-accent" />
                  {content.rating.toFixed(1)}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">{content.type}</Badge>
              {isPremiere && content.price && (
                <Badge className="gradient-gold text-background border-0">
                  ${content.price}
                </Badge>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {content.title}
            </h1>

            <div className="flex items-center gap-4 text-muted-foreground mb-4 flex-wrap">
              {content.releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-accent" />
                  {new Date(content.releaseDate).getFullYear()}
                </span>
              )}
              {content.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-accent" />
                  {Math.floor(content.duration / 3600)}h {Math.floor((content.duration % 3600) / 60)}m
                </span>
              )}
            </div>

            {/* Genres */}
            {content.genres && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {content.genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="bg-muted">
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
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              {isPremiere ? (
                <Button size="lg" className="gradient-gold text-background hover:opacity-90 gap-2">
                  <Ticket className="w-5 h-5" />
                  Buy Ticket - ${content.price}
                </Button>
              ) : (
                <Button size="lg" className="gradient-primary hover:opacity-90 gap-2">
                  <Play className="w-5 h-5 fill-white" />
                  Watch Now
                </Button>
              )}
              <Button size="lg" variant="outline" className="gap-2 border-border/50 hover:border-accent">
                <Plus className="w-5 h-5" />
                Add to List
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full hover:text-accent">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full hover:text-accent">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Cast & Crew */}
            {cast.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold mb-3 text-accent">Cast & Crew</h3>
                <div className="flex flex-wrap gap-2">
                  {cast.slice(0, 6).map((person: any, i: number) => (
                    <Badge key={i} variant="outline" className="py-1.5">
                      {person.name} <span className="text-muted-foreground ml-1">({person.role})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-accent">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-card">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
