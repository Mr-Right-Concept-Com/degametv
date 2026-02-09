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
        <div className="container mx-auto px-5 py-20 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Content not found</h1>
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
      <div className="relative h-[30vh] sm:h-[40vh] md:h-[50vh] bg-secondary">
        <img
          src={content.bannerUrl || content.thumbnailUrl}
          alt={content.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-5 -mt-20 sm:-mt-32 relative z-10 pb-12 sm:pb-16">
        <Button variant="ghost" size="sm" className="mb-4 sm:mb-6 rounded-full text-muted-foreground text-xs" asChild>
          <Link to="/">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
          {/* Poster — smaller on mobile */}
          <div className="flex-shrink-0 flex sm:block gap-4">
            <div className="relative w-28 sm:w-44 md:w-56">
              <img
                src={content.thumbnailUrl}
                alt={content.title}
                className="w-full rounded-xl sm:rounded-2xl shadow-lg"
              />
              {isPremiere && (
                <Badge className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-primary text-primary-foreground border-0 rounded-full text-[10px] sm:text-xs px-2 sm:px-3">
                  PREMIERE
                </Badge>
              )}
            </div>

            {/* Mobile: title beside poster */}
            <div className="flex-1 sm:hidden min-w-0">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {content.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-accent">
                    <Star className="w-3 h-3 fill-accent" />
                    {content.rating.toFixed(1)}
                  </span>
                )}
                <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full capitalize">{content.type}</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight mb-2 leading-tight">
                {content.title}
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                {content.releaseDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(content.releaseDate).getFullYear()}
                  </span>
                )}
                {content.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(content.duration / 3600)}h {Math.floor((content.duration % 3600) / 60)}m
                  </span>
                )}
              </div>
              {isPremiere ? (
                <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 font-semibold w-full h-10">
                  <Ticket className="w-4 h-4" />
                  Buy Ticket — ${content.price}
                </Button>
              ) : (
                <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 font-semibold w-full h-10">
                  <Play className="w-4 h-4" />
                  Watch Now
                </Button>
              )}
            </div>
          </div>

          {/* Details — desktop */}
          <div className="flex-1">
            {/* Desktop only header */}
            <div className="hidden sm:block">
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
            </div>

            {content.genres && (
              <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 flex-wrap">
                {content.genres.map((genre) => (
                  <span key={genre} className="text-[10px] sm:text-xs font-medium bg-secondary text-foreground px-2.5 sm:px-3 py-1 rounded-full">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-5 sm:mb-6">
              {content.description}
            </p>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-3 mb-8 flex-wrap">
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

            {/* Mobile Actions row */}
            <div className="flex sm:hidden items-center gap-2 mb-5">
              <Button size="sm" variant="outline" className="rounded-full gap-1.5 flex-1 text-xs h-9">
                <Plus className="w-3.5 h-3.5" />
                Add to List
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 hover:text-primary">
                <Heart className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 hover:text-primary">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-5 sm:mb-6">
                <h3 className="font-bold text-[10px] sm:text-sm mb-2 sm:mb-3 text-muted-foreground uppercase tracking-wider">Cast & Crew</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {cast.slice(0, 6).map((person: any, i: number) => (
                    <span key={i} className="text-[11px] sm:text-sm bg-secondary px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                      {person.name} <span className="text-muted-foreground">· {person.role}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {content.tags && content.tags.length > 0 && (
              <div>
                <h3 className="font-bold text-[10px] sm:text-sm mb-2 sm:mb-3 text-muted-foreground uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {content.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] sm:text-xs text-muted-foreground bg-secondary px-2.5 sm:px-3 py-1 rounded-full">
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
