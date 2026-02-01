import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSlider } from '@/components/content/HeroSlider';
import { ContentRow } from '@/components/content/ContentRow';
import { VirtualCinemaBanner } from '@/components/content/VirtualCinemaBanner';
import { FeaturedStars } from '@/components/content/FeaturedStars';
import { CategoriesGrid } from '@/components/content/CategoriesGrid';
import { NowShowingSection } from '@/components/content/NowShowingSection';
import { mockMovies, mockSeries, mockLiveStreams } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Play, Ticket, Film, Tv, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const heroSlides = mockMovies.filter(m => m.isFeatured).slice(0, 4).map((movie) => ({
  id: movie.id,
  title: movie.title,
  description: movie.description,
  banner: movie.bannerUrl || movie.thumbnailUrl,
  rating: movie.rating,
  year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined,
  duration: movie.duration,
  genres: movie.genres,
  isPremiere: movie.monetization === 'ticket',
  price: movie.price,
}));

export default function Index() {
  const trendingMovies = mockMovies.slice(0, 10).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnail: m.thumbnailUrl,
    type: 'movie' as const,
    rating: m.rating,
    duration: m.duration,
    year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : undefined,
    genre: m.genres?.[0],
  }));

  const seriesContent = mockSeries.slice(0, 10).map((s) => ({
    id: s.id,
    title: s.title,
    thumbnail: s.thumbnailUrl,
    type: 'series' as const,
    rating: s.rating,
    genre: s.genres?.[0],
  }));

  const liveContent = mockLiveStreams.slice(0, 10).map((l) => ({
    id: l.id,
    title: l.title,
    thumbnail: l.thumbnailUrl || l.bannerUrl,
    type: 'live' as const,
    isLive: l.status === 'live',
    viewerCount: l.viewerCount,
  }));

  const dramaContent = mockMovies.filter(m => m.genres?.includes('Drama')).slice(0, 10).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnail: m.thumbnailUrl,
    type: 'movie' as const,
    rating: m.rating,
    duration: m.duration,
    year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : undefined,
    genre: m.genres?.[0],
  }));

  const comedyContent = mockMovies.filter(m => m.genres?.includes('Comedy')).slice(0, 10).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnail: m.thumbnailUrl,
    type: 'movie' as const,
    rating: m.rating,
    duration: m.duration,
    year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : undefined,
    genre: m.genres?.[0],
  }));

  return (
    <MainLayout>
      {/* Hero Slider */}
      <HeroSlider slides={heroSlides} />

      {/* Virtual Cinema Banner */}
      <VirtualCinemaBanner />

      {/* Now Showing - Premieres */}
      <NowShowingSection />

      {/* Live Now Section */}
      {liveContent.some((l) => l.isLive) && (
        <ContentRow
          title="🔴 Live Now"
          items={liveContent.filter((l) => l.isLive)}
          viewAllHref="/live"
          className="bg-primary/5"
        />
      )}

      {/* Trending in Nigeria */}
      <ContentRow
        title="🔥 Trending in Nigeria"
        items={trendingMovies}
        viewAllHref="/movies"
      />

      {/* Featured Stars */}
      <FeaturedStars />

      {/* Popular Series */}
      <ContentRow
        title="Popular Series"
        items={seriesContent}
        viewAllHref="/series"
      />

      {/* Categories */}
      <CategoriesGrid />

      {/* Drama Section */}
      {dramaContent.length > 0 && (
        <ContentRow
          title="Drama"
          items={dramaContent}
          viewAllHref="/movies?genre=drama"
        />
      )}

      {/* Comedy Section */}
      {comedyContent.length > 0 && (
        <ContentRow
          title="Comedy"
          items={comedyContent}
          viewAllHref="/movies?genre=comedy"
        />
      )}

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden gradient-royal p-8 md:p-16">
            <div className="absolute inset-0 african-pattern opacity-30" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920')] bg-cover bg-center opacity-10" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Experience the Best of African Cinema
              </h2>
              <p className="text-white/80 text-lg mb-6">
                From Nollywood blockbusters to cultural documentaries. 
                Start watching today with a free trial.
              </p>
              <div className="flex items-center gap-4">
                <Button size="lg" className="gradient-gold text-background gap-2" asChild>
                  <Link to="/auth">
                    <Play className="w-5 h-5" />
                    Start Free Trial
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10" asChild>
                  <Link to="/cinema">
                    <Ticket className="w-5 h-5 mr-2" />
                    Buy Tickets
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '2.5K+', label: 'African Movies', icon: Film },
              { value: '385K+', label: 'Active Subscribers', icon: Star },
              { value: '50+', label: 'Countries', icon: Tv },
              { value: '4K', label: 'Ultra HD Quality', icon: Play },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <stat.icon className="w-8 h-8 text-accent mb-3" />
                <div className="text-4xl md:text-5xl font-display font-bold text-gradient-royal mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
