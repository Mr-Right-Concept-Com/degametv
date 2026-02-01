import { Link } from 'react-router-dom';
import { nollywoodStars } from '@/data/mockData';

export function FeaturedStars() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold">Popular Stars</h2>
            <p className="text-muted-foreground text-sm mt-1">Your favorite Nollywood actors</p>
          </div>
          <Link 
            to="/stars" 
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {nollywoodStars.map((star) => (
            <Link
              key={star.id}
              to={`/star/${star.id}`}
              className="group text-center"
            >
              <div className="relative mb-2">
                <div className="w-full aspect-square rounded-full overflow-hidden border-2 border-transparent group-hover:border-accent transition-all duration-300">
                  <img
                    src={star.image}
                    alt={star.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-accent transition-colors">
                {star.name}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{star.filmCount} films</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
