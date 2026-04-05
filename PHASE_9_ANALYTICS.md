# Phase 9: Advanced Analytics Dashboard

## Overview

Phase 9 implements a comprehensive analytics dashboard for the MOG Tracker app providing detailed insights into bid tracking, win rates, deadlines, agency performance, and commercial pipeline data across all three entities (Exousia, VitalX, IronHouse).

## Files Created

### 1. API Route
**File**: `src/app/api/analytics/route.ts`
- Server-side data aggregation endpoint
- Queries Supabase and computes analytics metrics
- Returns JSON with:
  - Pipeline summary (leads, bids, awards, value by entity)
  - Status distribution by entity
  - Source distribution (SAM.gov, eVA, eMMA, etc.)
  - Monthly trends (last 12 months)
  - Fit score distribution
  - Win rates per entity
  - Average time to award
  - Deadline proximity buckets
  - Top agencies with lead counts and values
  - Service category breakdown
  - VitalX commercial pipeline (funnel stages)

### 2. Analytics Components
All located in `src/components/analytics/`:

**PipelineSummaryCards.tsx**
- 4 metric cards: Total Leads, Active Bids, Awards, Pipeline Value
- Color-coded gradients
- Trend indicators

**LeadsByStatusChart.tsx**
- Stacked bar chart using recharts
- Shows lead distribution by status per entity
- Responsive, dark theme

**LeadsBySourceChart.tsx**
- Pie/donut chart showing lead distribution by source
- Color-coded by source type
- Handles empty data gracefully

**MonthlyTrendChart.tsx**
- Line chart showing 12-month historical trend
- One line per entity with entity branding colors
- Interactive tooltip

**FitScoreDistribution.tsx**
- Bar chart showing leads in fit score buckets (0-25, 26-50, 51-75, 76-100)
- Color gradient from red to green

**WinRateCards.tsx**
- Per-entity cards showing win rate percentage
- Awarded vs. Lost counts
- Visual progress bar

**DeadlineTimeline.tsx**
- Timeline visualization showing deadline proximity
- 5 buckets: Overdue, This Week, Next 14 Days, This Month, 60+ Days
- Color-coded with icon indicators

**TopAgenciesTable.tsx**
- Table showing top 10 agencies by lead count
- Columns: Agency, Lead Count, Total Value, Avg Fit Score
- Responsive design

**CategoryBreakdown.tsx**
- Grid view of service categories per entity
- Shows lead count and value per category
- Color-coded category indicators

**CommercialPipeline.tsx**
- VitalX-specific commercial pipeline visualization
- Funnel-style horizontal bars for stages:
  - Prospect → Outreach → Proposal → Negotiation → Contract → Lost → Inactive
- Total pipeline value summary

### 3. Analytics Page
**File**: `src/app/analytics/page.tsx`
- Main analytics dashboard page
- Full-width layout with Sidebar navigation
- Features:
  - Real-time data fetching from `/api/analytics`
  - Loading state with skeleton UI
  - Entity filter dropdown (All / Exousia / VitalX / IronHouse)
  - Refresh and Export buttons
  - Responsive grid layout
  - Dark theme matching app design

### 4. Sidebar Update
**File**: `src/components/layout/Sidebar.tsx` (updated)
- Added Analytics nav item with BarChart3 icon
- Positioned after Compliance in navigation
- Full navigation integration

## Key Features

### Dark Theme
- Primary background: #111827
- Secondary backgrounds: #1F2937, #374151
- Text colors: white, gray-300, gray-400
- Border colors: #374151, #374151

### Entity Branding
- Exousia: Gold (#D4AF37)
- VitalX: Teal (#06A59A)
- IronHouse: Amber (#B45309)
- MOG: Gold (#D4AF37)

### Charts & Visualization
- Uses recharts library (already installed)
- All charts responsive and mobile-friendly
- Tooltips with dark theme styling
- Legends properly positioned

### Data Aggregation
The API route aggregates data efficiently:
- Single parallel query to fetch all entity leads
- Computed calculations for win rates, fit scores, etc.
- Filtered for deadline proximity
- Grouped by status, source, agency, category
- Commercial pipeline summary

### Mobile Responsiveness
- Grid layouts adapt to screen size
- Summary cards stack on mobile (grid-cols-1)
- Tables become readable on small screens
- Chart heights remain consistent
- Navigation burger menu available

## Usage

1. **Access Analytics**: Click "Analytics" in the sidebar navigation
2. **View Dashboard**: Automatically loads analytics data
3. **Filter by Entity**: Use dropdown to view specific entity data or all entities
4. **Refresh Data**: Click "Refresh" button to reload latest data
5. **Export**: Export functionality available (button prepared for future integration)

## Data Sources

All data comes from Supabase tables:
- `gov_leads` - Government opportunities
- `commercial_leads` - VitalX commercial opportunities
- `service_categories` - Service category configuration

## Performance Considerations

- API route caches data per request (no persistent caching)
- Supabase RLS policies enforced
- Efficient parallel queries using Promise.all()
- Calculated metrics computed server-side
- Responsive charts render efficiently with recharts

## Future Enhancements

- Export to CSV/PDF functionality
- Date range filtering
- Role-based dashboard customization
- Real-time data updates via WebSocket
- Comparative period analysis
- Individual entity dashboard customization
- Email delivery of analytics reports

## TypeScript Compliance

- All files pass TypeScript type checking
- Proper use of types from `@/lib/types.ts`
- Constants from `@/lib/constants.ts`
- No type errors in analytics module (pre-existing docx errors excluded)

## Testing Checklist

- [ ] Navigate to /analytics page
- [ ] Verify all components render without errors
- [ ] Check API route returns valid JSON
- [ ] Filter by entity dropdown works
- [ ] Refresh button reloads data
- [ ] Charts display data correctly
- [ ] Mobile responsiveness verified
- [ ] Dark theme colors consistent
- [ ] No console errors or warnings

## Notes

- Page is client-side rendered with data fetching in useEffect
- Loading skeleton UI shown while data loads
- Error handling implemented for API failures
- Component follows existing app patterns and conventions
- All dependencies already in package.json (recharts)
