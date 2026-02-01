import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronLeft, ChevronRight, Star, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HeroSlide {
  id: string;
  title: string;
  description: string;
  banner: string;
  rating?: number;
  year?: number;
  duration?: number;
  genres?: string[];
  isPremiere?: boolean;
  price?: number;
}

interface HeroSliderProps {
  slides: HeroSlide[];
  autoPlay?: boolean;
  interval?: number;
}

export function HeroSlider({ slides, autoPlay = true, interval = 6000 }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <section className="relative h-[70vh] md:h-[85vh] overflow-hidden">
      {/* Background Image */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
        >
          <img
            src={slide.banner}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {/* African Pattern Overlay */}
          <div className="absolute inset-0 african-pattern" />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      ))}

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {currentSlide.isPremiere && (
                <Badge className="premiere-badge text-background border-0">
                  <Ticket className="w-3 h-3 mr-1" />
                  PREMIERE
                </Badge>
              )}
              {currentSlide.rating && currentSlide.rating > 0 && (
                <Badge className="bg-accent/20 text-accent border-accent/50">
                  <Star className="w-3 h-3 mr-1 fill-accent" />
                  {currentSlide.rating.toFixed(1)}
                </Badge>
              )}
              {currentSlide.year && (
                <Badge variant="outline">{currentSlide.year}</Badge>
              )}
              {currentSlide.duration && (
                <Badge variant="outline">
                  {Math.floor(currentSlide.duration / 3600)}h {Math.floor((currentSlide.duration % 3600) / 60)}m
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 animate-fade-in">
              {currentSlide.title}
            </h1>

            {/* Genres */}
            {currentSlide.genres && (
              <div className="flex items-center gap-2 mb-4">
                {currentSlide.genres.slice(0, 3).map((genre, i) => (
                  <span key={genre} className="text-sm text-muted-foreground">
                    {genre}
                    {i < Math.min(currentSlide.genres!.length, 3) - 1 && (
                      <span className="ml-2 text-accent">•</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-muted-foreground text-lg mb-6 line-clamp-3 animate-fade-in">
              {currentSlide.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 animate-fade-in">
              {currentSlide.isPremiere ? (
                <Button size="lg" className="gradient-gold text-background hover:opacity-90 gap-2">
                  <Ticket className="w-5 h-5" />
                  Buy Ticket {currentSlide.price && `- $${currentSlide.price}`}
                </Button>
              ) : (
                <Button size="lg" className="gradient-primary hover:opacity-90 gap-2">
                  <Play className="w-5 h-5 fill-white" />
                  Watch Now
                </Button>
              )}
              <Button size="lg" variant="outline" className="gap-2 border-border/50 hover:border-accent" asChild>
                <Link to={`/content/${currentSlide.id}`}>
                  <Info className="w-5 h-5" />
                  More Info
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/30 backdrop-blur-sm hover:bg-background/50 border border-border/30"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/30 backdrop-blur-sm hover:bg-background/50 border border-border/30"
            onClick={goToNext}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-8 bg-accent'
                  : 'w-2 bg-white/30 hover:bg-white/50'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
