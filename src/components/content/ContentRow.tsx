import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard } from './ContentCard';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  thumbnail: string;
  type: 'movie' | 'series' | 'live' | 'episode';
  rating?: number;
  duration?: number;
  year?: number;
  genre?: string;
  isLive?: boolean;
  viewerCount?: number;
}

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  viewAllHref?: string;
  className?: string;
}

export function ContentRow({ title, items, viewAllHref, className }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <section className={cn('py-8', className)}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold">{title}</h2>
          <div className="flex items-center gap-2">
            {viewAllHref && (
              <Button variant="link" className="text-primary" asChild>
                <a href={viewAllHref}>View All</a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-40 md:w-48" style={{ scrollSnapAlign: 'start' }}>
              <ContentCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
