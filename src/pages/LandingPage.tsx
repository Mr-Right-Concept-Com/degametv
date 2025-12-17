import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Zap, Shield, Globe, Users, Tv, Film, Radio, 
  Clapperboard, Ticket, BarChart3, Code2, ChevronRight,
  Star, Check, ArrowRight
} from 'lucide-react';

const modules = [
  {
    icon: Film,
    title: 'OTT / VOD',
    description: 'Netflix-like streaming with SVOD, TVOD, and AVOD monetization',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Radio,
    title: 'Live Streaming',
    description: 'Professional live events, sports, concerts, and conferences',
    color: 'from-red-500 to-red-600',
  },
  {
    icon: Clapperboard,
    title: 'Virtual Cinema',
    description: 'Secure digital cinema & festival screenings with DRM',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: Tv,
    title: 'Linear TV / FAST',
    description: '24/7 scheduled channels with EPG and ad insertion',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Ticket,
    title: 'Ticketing',
    description: 'Universal ticketing for all content types',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & AI',
    description: 'Intelligence layer with recommendations and insights',
    color: 'from-green-500 to-green-600',
  },
];

const features = [
  { icon: Zap, title: '4K Ultra HD', description: 'Crystal clear streaming' },
  { icon: Shield, title: 'DRM Protected', description: 'Enterprise security' },
  { icon: Globe, title: 'Global CDN', description: '190+ countries' },
  { icon: Users, title: 'Multi-Tenant', description: 'Fully white-label' },
];

const testimonials = [
  {
    quote: "AGE Media transformed our film festival into a global event. The virtual cinema module is incredible.",
    author: "Sarah Chen",
    role: "Director, Indie Film Festival",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    quote: "We launched our streaming service in weeks, not months. The white-label solution is exactly what we needed.",
    author: "Marcus Johnson",
    role: "CEO, StreamCo",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    quote: "The analytics and AI recommendations increased our viewer engagement by 340%. Absolutely game-changing.",
    author: "Emily Rodriguez",
    role: "Head of Product, MediaHub",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  },
];

const stats = [
  { value: '50M+', label: 'Monthly Viewers' },
  { value: '10K+', label: 'Content Items' },
  { value: '190+', label: 'Countries' },
  { value: '99.9%', label: 'Uptime' },
];

const plans = [
  {
    name: 'Starter',
    price: 299,
    description: 'Perfect for small creators and startups',
    features: ['OTT Module', 'Up to 100 videos', '10K monthly views', 'Basic analytics', 'Email support'],
    popular: false,
  },
  {
    name: 'Professional',
    price: 799,
    description: 'For growing media businesses',
    features: ['All Starter features', 'Live Streaming', 'Virtual Cinema', 'Unlimited content', '100K monthly views', 'White-label', 'Priority support'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'For large-scale deployments',
    features: ['All Professional features', 'All modules included', 'Unlimited everything', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Custom development'],
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AGE Media
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Modules</a>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Link to="/movies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Browse</Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button className="bg-gradient-primary" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Star className="w-3 h-3 mr-1 fill-primary" />
              The Complete Media Operating System
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Build Your Own
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Streaming Empire
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A modular, multi-tenant, white-label SaaS platform for OTT, Live Streaming, 
              Virtual Cinema, and more. Launch your streaming service in days, not years.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-gradient-primary gap-2 text-lg px-8" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-lg px-8" asChild>
                <Link to="/movies">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </Link>
              </Button>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
            <Badge className="mb-4">Modular Architecture</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              12 Powerful Modules, Infinite Possibilities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each module works independently or combines seamlessly with others. 
              Pay only for what you need.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div
                key={module.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
                <p className="text-muted-foreground">{module.description}</p>
                <Button variant="ghost" className="mt-4 gap-2 p-0 h-auto text-primary">
                  Learn more
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Enterprise Ready</Badge>
              <h2 className="text-4xl font-display font-bold mb-6">
                Built for Scale, Designed for Growth
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Whether you're launching a niche streaming service or building the next 
                big media platform, AGE Media scales with your ambitions.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="w-5 h-5 text-primary" />
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
                  src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=450&fit=crop"
                  alt="Platform Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end p-6">
                  <Button className="bg-gradient-primary gap-2">
                    <Play className="w-5 h-5 fill-white" />
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
            <Badge className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-display font-bold">
              Trusted by Industry Leaders
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
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
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. All plans include core features.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl bg-card border ${
                  plan.popular ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
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
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? 'bg-gradient-primary' : ''}`}
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
          <div className="relative rounded-3xl overflow-hidden bg-gradient-primary p-12 md:p-20 text-center">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920')] bg-cover bg-center opacity-10" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
                Ready to Launch Your Streaming Platform?
              </h2>
              <p className="text-white/80 text-lg mb-8">
                Join thousands of media companies already using AGE Media to power their streaming services.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="gap-2 text-lg px-8" asChild>
                  <Link to="/auth">
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
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
                <span className="text-xl font-display font-bold">AGE Media</span>
              </Link>
              <p className="text-muted-foreground mb-4">
                The complete media operating system for modern streaming businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Modules</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Enterprise</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
            <p>© 2024 AGE Media. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
