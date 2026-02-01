
# DeGameTV - African Cinema Streaming Platform Redesign

## Overview
Transform the current AGE Media platform into **DeGameTV** - a premium African cinema (Nollywood) streaming platform. The design will be production-ready, focused on Nigerian/African movies and series, with a virtual cinema model similar to Spixie.net.

---

## Brand Identity Changes

### Platform Name & Branding
- **Name**: DeGameTV (replacing AGE Media)
- **Tagline**: "Your Gateway to African Cinema" or "Stream Nollywood, Anytime"
- **Focus**: Nollywood films, African series, drama, romance, cultural content
- **Color Palette**: 
  - Primary: Deep burgundy/wine (#8B0000)
  - Accent: Gold (#D4AF37) - representing African royalty
  - Secondary: Rich purple (#4A0080)
  - Background: Dark cinematic (#0A0A0F)

---

## Files to Create/Modify

### 1. Core Theme & Styling
**Modify**: `src/index.css`
- New DeGameTV color scheme with African cinema aesthetic
- Warm gold accents, deep burgundy primary
- Updated gradients for Nollywood feel

### 2. New Mock Data - African Content
**Modify**: `src/data/mockData.ts`
- Replace generic content with Nigerian/African movies
- Add sample Nollywood films like "Keleke", "Omo Ghetto", "King of Boys"
- Include genres: Drama, Romance, Comedy, Cultural, Action, Family
- Add prominent Nollywood actors in cast data

### 3. Homepage Redesign
**Modify**: `src/pages/Index.tsx`
- Featured African movie hero slider
- "Now Showing" virtual cinema section
- "Trending in Nigeria" content row
- "New Releases" section
- Categories: Drama, Romance, Comedy, Action, Family, Cultural
- "Popular Stars" section featuring Nollywood actors

### 4. Landing Page for B2B (Tenant Onboarding)
**Modify**: `src/pages/LandingPage.tsx`
- Rebrand from AGE Media to DeGameTV business platform
- Showcase platform for African content creators
- Virtual cinema capabilities for film festivals
- White-label solutions for African streaming services

### 5. Movies Page - Nollywood Focus
**Modify**: `src/pages/Movies.tsx`
- African-themed genre filters
- Highlight Nollywood categories
- "Latest Premieres" section
- Rating system with local context

### 6. Series Page
**Modify**: `src/pages/Series.tsx`
- Focus on African TV series, web series
- Telenovelas, drama series, reality shows

### 7. Navbar Updates
**Modify**: `src/components/layout/Navbar.tsx`
- DeGameTV branding
- Navigation: Home, Movies, Series, Live, Cinema
- African-inspired design elements

### 8. Footer Updates
**Modify**: `src/components/layout/Footer.tsx`
- DeGameTV branding
- African content creator links
- Social media presence

### 9. Content Card Enhancement
**Modify**: `src/components/content/ContentCard.tsx`
- Nigerian movie poster style
- "Now Showing" badge for virtual cinema
- "Premiere" indicators

### 10. Hero Slider - Virtual Cinema Style
**Modify**: `src/components/content/HeroSlider.tsx`
- Cinematic African movie hero
- "Buy Ticket" CTA for premieres
- Screening countdown timers

### 11. Content Detail Page
**Modify**: `src/pages/ContentDetail.tsx`
- Nollywood cast showcase
- Related African content
- Virtual cinema ticket purchase
- Streaming window information

### 12. Cinema/Virtual Screening Page
**Modify**: `src/pages/Cinema.tsx`
- Virtual cinema scheduling
- Film festival events
- Premiere tickets
- Screening calendars

### 13. Live Events Page
**Modify**: `src/pages/Live.tsx`
- African live events
- Award shows, premieres
- Cultural events

---

## New Components to Create

### 1. Featured Stars Component
**Create**: `src/components/content/FeaturedStars.tsx`
- Showcase popular Nollywood actors
- Actor profile cards with filmography links

### 2. Virtual Cinema Banner
**Create**: `src/components/content/VirtualCinemaBanner.tsx`
- Highlight upcoming premieres
- Countdown to screening
- Ticket purchase CTA

### 3. Categories Grid
**Create**: `src/components/content/CategoriesGrid.tsx`
- Visual genre categories
- African-themed category icons/images

### 4. Now Showing Section
**Create**: `src/components/content/NowShowingSection.tsx`
- Currently available premieres
- Time-limited viewing windows
- Ticket status

---

## Technical Implementation

### Parallel Build Strategy
All pages and components will be created/modified simultaneously:

**Batch 1** (Foundation):
- `src/index.css` - Theme
- `src/data/mockData.ts` - Content
- `src/types/index.ts` - Type updates if needed

**Batch 2** (Layout Components):
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/MainLayout.tsx`

**Batch 3** (Content Components):
- `src/components/content/HeroSlider.tsx`
- `src/components/content/ContentCard.tsx`
- `src/components/content/ContentRow.tsx`
- `src/components/content/FeaturedStars.tsx` (new)
- `src/components/content/VirtualCinemaBanner.tsx` (new)
- `src/components/content/CategoriesGrid.tsx` (new)
- `src/components/content/NowShowingSection.tsx` (new)

**Batch 4** (Pages):
- `src/pages/Index.tsx`
- `src/pages/Movies.tsx`
- `src/pages/Series.tsx`
- `src/pages/Live.tsx`
- `src/pages/Cinema.tsx`
- `src/pages/ContentDetail.tsx`
- `src/pages/LandingPage.tsx`

**Batch 5** (Routes & Final):
- `src/App.tsx` - Route updates
- `index.html` - Meta tags update

---

## Sample Mock Data Structure

### Movies
```
- "Keleke" - Drama, Festival favorite
- "King of Boys" - Action, Crime
- "Omo Ghetto: The Saga" - Comedy
- "The Wedding Party" - Romance, Comedy
- "Citation" - Drama, Social
- "Lionheart" - Drama, Family Business
- "The Set Up" - Thriller, Romance
- "A Sunday Affair" - Romance, Drama
```

### Genres
- Drama, Romance, Comedy, Action
- Family, Cultural Heritage, Thriller
- Crime, Social Commentary, Musical

### Featured Actors
- Funke Akindele, Genevieve Nnaji, Omotola Jalade
- Ramsey Nouah, Richard Mofe-Damijo, Odunlade Adekola
- Toyin Abraham, Mercy Johnson, Eniola Badmus

---

## Key Features

1. **Virtual Cinema Experience**
   - Timed premiere screenings
   - Ticket-based access
   - Exclusive viewing windows (like Spixie subdomains)

2. **Nollywood Focus**
   - Nigerian content first
   - Regional African content
   - Diaspora-friendly interface

3. **Cultural Categories**
   - Yoruba movies
   - Igbo movies
   - Hausa movies
   - Pan-African content

4. **Production-Ready**
   - All components fully functional
   - Responsive design
   - Dark theme optimized for cinema feel
   - Proper error handling
   - Loading states

---

## Admin Dashboard Updates
The admin modules remain intact but will reference DeGameTV branding where appropriate in the UI labels.
