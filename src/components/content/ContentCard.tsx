import { Link } from 'react-router-dom';
import { Play, Star, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ContentCardProps {
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
  className?: string;
}

export function ContentCard({
  id,
  title,
  thumbnail,
  type,
  rating,
  duration,
  year,
  genre,
  isLive,
  viewerCount,
  className,
}: ContentCardProps) {
  const href = type === 'live' ? `/live/${id}` : `/content/${id}`;

  return (
    <Link
      to={href}
      className={cn(
        'group relative block rounded-xl overflow-hidden bg-card border border-border/50 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {isLive && (
            <Badge className="bg-accent text-white border-0 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full mr-1.5" />
              LIVE
            </Badge>
          )}
          {rating && (
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm ml-auto">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              {rating.toFixed(1)}
            </Badge>
          )}
        </div>

        {/* Live Viewer Count */}
        {isLive && viewerCount && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              {viewerCount.toLocaleString()} watching
            </Badge>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {year && <span>{year}</span>}
          {genre && (
            <>
              <span>•</span>
              <span>{genre}</span>
            </>
          )}
          {duration && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(duration / 60)}h {duration % 60}m
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
