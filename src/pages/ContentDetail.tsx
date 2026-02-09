import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Share2, Star, Clock, Calendar, Heart, Ticket, ArrowLeft } from 'lucide-react';
import { mockMovies, mockSeries } from '@/data/mockData';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();

  const content = [...mockMovies, ...mockSeries].find((c) => c.id === id);

  if (!content) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Content not found</h1>
          <Button asChild className="rounded-full">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isPremiere = content.monetization === 'ticket';
  const cast = content.castCrew && Array.isArray(content.castCrew) ? content.castCrew : [];

  return (
    <MainLayout>
      {/* Hero image */}
      <div className="relative h-[40vh] md:h-[50vh] bg-secondary">
        <img
          src={content.bannerUrl || content.thumbnailUrl}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-32 relative z-10 pb-16">
        <Button variant="ghost" size="sm" className="mb-6 rounded-full text-muted-foreground" asChild>
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative">
              <img
                src={content.thumbnailUrl}
                alt={content.title}
                className="w-44 md:w-56 rounded-2xl shadow-lg"
              />
              {isPremiere && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground border-0 rounded-full text-xs px-3">
                  PREMIERE
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {content.rating > 0 && (
                <span className="flex items-center gap-1 text-sm font-medium text-accent">
                  <Star className="w-4 h-4 fill-accent" />
                  {content.rating.toFixed(1)}
                </span>
              )}
              <Badge variant="secondary" className="capitalize rounded-full">{content.type}</Badge>
              {isPremiere && content.price && (
                <Badge className="bg-primary text-primary-foreground border-0 rounded-full">
                  ${content.price}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {content.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
              {content.releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(content.releaseDate).getFullYear()}
                </span>
              )}
              {content.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(content.duration / 3600)}h {Math.floor((content.duration % 3600) / 60)}m
                </span>
              )}
            </div>

            {content.genres && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {content.genres.map((genre) => (
                  <span key={genre} className="text-xs font-medium bg-secondary text-foreground px-3 py-1 rounded-full">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
              {content.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              {isPremiere ? (
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold px-8">
                  <Ticket className="w-5 h-5" />
                  Buy Ticket — ${content.price}
                </Button>
              ) : (
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold px-8">
                  <Play className="w-5 h-5" />
                  Watch Now
                </Button>
              )}
              <Button size="lg" variant="outline" className="rounded-full gap-2">
                <Plus className="w-5 h-5" />
                Add to List
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full hover:text-primary">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full hover:text-primary">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Cast & Crew</h3>
                <div className="flex flex-wrap gap-2">
                  {cast.slice(0, 6).map((person: any, i: number) => (
                    <span key={i} className="text-sm bg-secondary px-3 py-1.5 rounded-full">
                      {person.name} <span className="text-muted-foreground">· {person.role}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {content.tags && content.tags.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag: string) => (
                    <span key={tag} className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                      #{tag}
                    </span>
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
