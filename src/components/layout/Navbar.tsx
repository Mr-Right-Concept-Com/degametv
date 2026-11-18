import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, Ticket, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useBranding } from '@/components/branding/BrandingProvider';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isPlatformAdmin } = useTenant();
  const navigate = useNavigate();
  const branding = useBranding();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cinema?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const navLinks = [
    { label: 'Now Showing', href: '/' },
    { label: 'Upcoming', href: '/cinema' },
  ];

  const isAdmin = isSuperAdmin || isPlatformAdmin;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 sm:px-5">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={branding.logoUrl || '/brand/degametv-lockup.svg'} alt={branding.platformName || 'DeGameTV'} className="h-8 sm:h-10 w-auto max-w-[170px] object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search screenings..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-44 lg:w-56 pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30 h-9"
                />
              </div>
            </form>

            {/* Mobile search toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={isSearchOpen ? "Close search" : "Open search"}
              aria-expanded={isSearchOpen}
              className="md:hidden rounded-full h-9 w-9"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </Button>

            {user ? (
              <>
                <Button size="sm" className="hidden sm:flex gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs" asChild>
                  <Link to="/cinema">
                    <Ticket className="w-3.5 h-3.5" />
                    Get Tickets
                  </Link>
                </Button>

                <Button variant="ghost" size="icon" aria-label="Open my dashboard" className="rounded-full h-9 w-9" onClick={() => navigate('/dashboard')}>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span aria-hidden="true" className="text-xs font-bold text-primary">{user.email?.charAt(0).toUpperCase()}</span>
                  </div>
                </Button>
 </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button variant="ghost" className="rounded-full h-9 text-xs sm:text-sm px-3 sm:px-4" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/cinema')} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-9 text-xs sm:text-sm px-3 sm:px-4">
                  <Ticket className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Get Tickets</span>
                  <span className="sm:hidden">Tickets</span>
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="md:hidden rounded-full h-9 w-9"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {isSearchOpen && (
          <form onSubmit={handleSearch} className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search screenings..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30 h-10"
                autoFocus
              />
            </div>
          </form>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-2 border-t border-border">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setIsMenuOpen(false)}>
                  <User className="h-4 w-4" /> My Dashboard
                </Link>
         </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
