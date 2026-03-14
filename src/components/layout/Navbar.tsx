import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, Ticket, LayoutDashboard, Film, Upload, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useTenant } from '@/hooks/useTenant';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isPlatformAdmin } = useTenant();
  const navigate = useNavigate();

  const navLinks = [
    { label: 'Now Showing', href: '/' },
    { label: 'Upcoming', href: '/cinema' },
    { label: 'Submit Film', href: '/filmmaker' },
  ];

  const isAdmin = isSuperAdmin || isPlatformAdmin;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 sm:px-5">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center">
              <Film className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              DeGameTV
            </span>
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
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="w-44 lg:w-56 pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30 h-9"
                />
              </div>
            </div>

            {/* Mobile search toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full h-9 w-9"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="w-4 h-4" />
            </Button>

            {user ? (
              <>
                <Button size="sm" className="hidden sm:flex gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs" asChild>
                  <Link to="/cinema">
                    <Ticket className="w-3.5 h-3.5" />
                    Get Tickets
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="text-sm">
                      <User className="w-4 h-4 mr-2" />
                      My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/tickets')} className="text-sm">
                      <Ticket className="w-4 h-4 mr-2" />
                      My Tickets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/filmmaker')} className="text-sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Submit a Film
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/studio')} className="text-sm">
                      <Clapperboard className="w-4 h-4 mr-2" />
                      Studio Dashboard
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="text-sm">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="text-sm text-destructive focus:text-destructive">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
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
              className="md:hidden rounded-full h-9 w-9"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {isSearchOpen && (
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search screenings..."
                className="pl-9 rounded-full bg-secondary border-0 focus-visible:ring-primary/30 h-10"
                autoFocus
              />
            </div>
          </div>
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
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Dashboard
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
