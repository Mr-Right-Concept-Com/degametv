import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Zap, Shield, Globe, Users, Tv, Film, Radio, 
  Ticket, BarChart3, ChevronRight,
  Star, Check, ArrowRight
} from 'lucide-react';

const modules = [
  {
    icon: Film,
    title: 'OTT / VOD',
    description: 'Stream movies and series with SVOD, TVOD, and AVOD monetization',
    color: 'from-primary to-primary/80',
  },
  {
    icon: Radio,
    title: 'Live Streaming',
    description: 'Professional live events, concerts, and premieres',
    color: 'from-red-600 to-red-500',
  },
  {
    icon: Ticket,
    title: 'Virtual Cinema',
    description: 'Secure digital cinema & festival screenings with DRM',
    color: 'from-accent to-amber-600',
  },
  {
    icon: Tv,
    title: 'Linear TV / FAST',
    description: '24/7 scheduled channels with EPG and ad insertion',
    color: 'from-blue-600 to-blue-500',
  },
  {
    icon: Users,
    title: 'Multi-Tenant',
    description: 'White-label platform for content distributors',
    color: 'from-green-600 to-green-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & AI',
    description: 'Intelligence layer with recommendations and insights',
    color: 'from-violet-600 to-violet-500',
  },
];

const features = [
  { icon: Zap, title: '4K Ultra HD', description: 'Crystal clear streaming' },
  { icon: Shield, title: 'DRM Protected', description: 'Enterprise security' },
  { icon: Globe, title: 'Global CDN', description: '50+ countries' },
  { icon: Users, title: 'White-Label', description: 'Your brand, your platform' },
];

const testimonials = [
  {
    quote: "DeGameTV transformed how we distribute Nollywood content globally. The virtual cinema feature is a game changer.",
    author: "Chioma Adeyemi",
    role: "CEO, African Film Distributors",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop",
  },
  {
    quote: "We launched our streaming service for African diaspora in weeks. The platform handles everything from ticketing to DRM.",
    author: "Kwame Mensah",
    role: "Founder, PanAfrican Stream",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
  },
  {
    quote: "Our film festival went virtual seamlessly. Over 50,000 viewers across 30 countries in our first premiere.",
    author: "Amara Okonkwo",
    role: "Director, Lagos Film Festival",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
  },
];

const stats = [
  { value: '125M+', label: 'Monthly Views' },
  { value: '2.5K+', label: 'African Films' },
  { value: '50+', label: 'Countries' },
  { value: '99.9%', label: 'Uptime' },
];

const plans = [
  {
    name: 'Starter',
    price: 199,
    description: 'Perfect for independent filmmakers',
    features: ['OTT Module', 'Up to 50 videos', '5K monthly views', 'Basic analytics', 'Email support'],
    popular: false,
  },
  {
    name: 'Professional',
    price: 499,
    description: 'For growing studios and distributors',
    features: ['All Starter features', 'Virtual Cinema', 'Live Streaming', 'Unlimited content', '50K monthly views', 'White-label', 'Priority support'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'For major distributors and broadcasters',
    features: ['All Professional features', 'All modules included', 'Unlimited everything', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Custom development'],
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg gradient-royal flex items-center justify-center">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold text-gradient-royal">
                  DeGameTV
                </span>
                <span className="text-[8px] text-muted-foreground -mt-1 tracking-wider">
                  FOR BUSINESS
                </span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Modules</a>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Watch Content</Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button className="gradient-gold text-background" asChild>
                <Link to="/onboarding">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 african-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-accent/20 text-accent border-accent/30">
              <Star className="w-3 h-3 mr-1 fill-accent" />
              African Cinema Distribution Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Launch Your
              <span className="block text-gradient-royal">
                African Streaming Empire
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The complete white-label platform for Nollywood and African content. 
              Virtual cinema, OTT, live streaming - launch your service in days.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gradient-gold text-background gap-2 text-lg px-8" asChild>
                <Link to="/onboarding">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-lg px-8 border-border/50 hover:border-accent" asChild>
                <Link to="/">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </Link>
              </Button>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/30 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl md:text-5xl font-display font-bold text-gradient-royal">
                  {stat.value}
                </p>
                <p className="text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Modular Architecture</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Everything You Need for African Content
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modular platform built specifically for African cinema distribution.
              Enable what you need, pay for what you use.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div
                key={module.title}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-accent/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
                <p className="text-muted-foreground">{module.description}</p>
                <Button variant="ghost" className="mt-4 gap-2 p-0 h-auto text-accent">
                  Learn more
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Built for Africa</Badge>
              <h2 className="text-4xl font-display font-bold mb-6">
                Platform Designed for African Content Distribution
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                From Lagos to London, Accra to Atlanta. Reach the African diaspora 
                with a platform that understands the unique needs of African content.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <feature.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden border border-border shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=450&fit=crop"
                  alt="Platform Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end p-6">
                  <Button className="gradient-gold text-background gap-2">
                    <Play className="w-5 h-5" />
                    Watch Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Testimonials</Badge>
            <h2 className="text-4xl font-display font-bold">
              Trusted by African Content Leaders
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="p-6 rounded-2xl bg-card border border-border/50"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-accent fill-accent" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Pricing</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as your audience grows. Built for African content success.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl bg-card border ${
                  plan.popular ? 'border-accent shadow-lg shadow-accent/20' : 'border-border/50'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-gold text-background border-0">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  {plan.price ? (
                    <span className="text-4xl font-bold">${plan.price}</span>
                  ) : (
                    <span className="text-4xl font-bold">Custom</span>
                  )}
                  {plan.price && <span className="text-muted-foreground">/month</span>}
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? 'gradient-gold text-background' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.price ? 'Get Started' : 'Contact Sales'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden gradient-royal p-12 md:p-20 text-center">
            <div className="absolute inset-0 african-pattern opacity-20" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920')] bg-cover bg-center opacity-10" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Ready to Distribute African Cinema Globally?
              </h2>
              <p className="text-white/80 text-lg mb-8">
                Join the leading platform for Nollywood and African content distribution.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="gradient-gold text-background gap-2 text-lg px-8" asChild>
                  <Link to="/onboarding">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 gap-2 text-lg px-8">
                  Talk to Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-royal flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-gradient-royal">DeGameTV</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} DeGameTV. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
