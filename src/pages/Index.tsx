import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSlider } from '@/components/content/HeroSlider';
import { ContentRow } from '@/components/content/ContentRow';
import { mockMovies, mockSeries, mockLiveStreams, mockChannels } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Play, Zap, Shield, Globe, Users, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

const heroSlides = mockMovies.slice(0, 4).map((movie) => ({
  id: movie.id,
  title: movie.title,
  description: movie.description,
  banner: movie.banner_url || movie.thumbnail_url,
  rating: movie.rating,
  year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
  duration: movie.duration,
  genres: movie.genres,
}));

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Stream in 4K HDR with zero buffering on any device',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted and protected at all times',
  },
  {
    icon: Globe,
    title: 'Watch Anywhere',
    description: 'Available in 190+ countries on all your devices',
  },
  {
    icon: Users,
    title: 'Family Friendly',
    description: 'Create profiles with parental controls for kids',
  },
];

export default function Index() {
  const trendingContent = mockMovies.slice(0, 10).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnail: m.thumbnail_url,
    type: 'movie' as const,
    rating: m.rating,
    duration: m.duration,
    year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
    genre: m.genres?.[0],
  }));

  const seriesContent = mockSeries.slice(0, 10).map((s) => ({
    id: s.id,
    title: s.title,
    thumbnail: s.thumbnail_url,
    type: 'series' as const,
    rating: s.rating,
    genre: s.genres?.[0],
  }));

  const liveContent = mockLiveStreams.slice(0, 10).map((l) => ({
    id: l.id,
    title: l.title,
    thumbnail: l.thumbnail_url || l.banner_url,
    type: 'live' as const,
    isLive: l.status === 'live',
    viewerCount: l.viewer_count,
  }));

  return (
    <MainLayout>
      {/* Hero Slider */}
      <HeroSlider slides={heroSlides} />

      {/* Live Now Section */}
      {liveContent.some((l) => l.isLive) && (
        <ContentRow
          title="🔴 Live Now"
          items={liveContent.filter((l) => l.isLive)}
          viewAllHref="/live"
          className="bg-accent/5"
        />
      )}

      {/* Trending Movies */}
      <ContentRow
        title="Trending Movies"
        items={trendingContent}
        viewAllHref="/movies"
      />

      {/* Popular Series */}
      <ContentRow
        title="Popular Series"
        items={seriesContent}
        viewAllHref="/series"
      />

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-b from-background to-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Why Choose AGE Media?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience entertainment like never before with our cutting-edge streaming platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-primary p-8 md:p-16">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920')] bg-cover bg-center opacity-20" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Start Streaming Today
              </h2>
              <p className="text-white/80 text-lg mb-6">
                Join millions of viewers and access unlimited entertainment. 
                First month free, cancel anytime.
              </p>
              <div className="flex items-center gap-4">
                <Button size="lg" variant="secondary" className="gap-2" asChild>
                  <Link to="/auth">
                    <Play className="w-5 h-5" />
                    Get Started Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10" asChild>
                  <Link to="/pricing">
                    View Plans
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
              { value: '10K+', label: 'Movies & Shows' },
              { value: '5M+', label: 'Active Users' },
              { value: '190+', label: 'Countries' },
              { value: '4K', label: 'Ultra HD' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
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
