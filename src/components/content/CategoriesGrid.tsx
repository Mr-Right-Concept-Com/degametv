import { Link } from 'react-router-dom';
import { Film, Heart, Laugh, Sword, Users, MapPin, Theater, Music } from 'lucide-react';

const categories = [
  {
    id: 'drama',
    name: 'Drama',
    icon: Theater,
    color: 'from-primary to-primary/80',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=250&fit=crop',
  },
  {
    id: 'romance',
    name: 'Romance',
    icon: Heart,
    color: 'from-pink-600 to-pink-500',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=250&fit=crop',
  },
  {
    id: 'comedy',
    name: 'Comedy',
    icon: Laugh,
    color: 'from-amber-600 to-amber-500',
    image: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=250&fit=crop',
  },
  {
    id: 'action',
    name: 'Action',
    icon: Sword,
    color: 'from-red-600 to-red-500',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=250&fit=crop',
  },
  {
    id: 'family',
    name: 'Family',
    icon: Users,
    color: 'from-green-600 to-green-500',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop',
  },
  {
    id: 'yoruba',
    name: 'Yoruba',
    icon: MapPin,
    color: 'from-accent to-accent/80',
    image: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=250&fit=crop',
  },
  {
    id: 'igbo',
    name: 'Igbo',
    icon: Film,
    color: 'from-emerald-600 to-emerald-500',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=250&fit=crop',
  },
  {
    id: 'musical',
    name: 'Musical',
    icon: Music,
    color: 'from-violet-600 to-violet-500',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=250&fit=crop',
  },
];

export function CategoriesGrid() {
  return (
    <section className="py-12 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display font-bold mb-2">Browse by Category</h2>
          <p className="text-muted-foreground">Explore African cinema by genre and culture</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/movies?genre=${category.id}`}
              className="group relative aspect-[16/9] rounded-xl overflow-hidden"
            >
              {/* Background Image */}
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-70 group-hover:opacity-80 transition-opacity`} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <category.icon className="w-8 h-8 mb-2 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
