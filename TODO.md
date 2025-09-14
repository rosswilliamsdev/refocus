# reFocus - Development TODO List

## 🎯 Core Features

### ✅ Completed Features

- [x] Smart timer management with pause/resume on tab switching
- [x] Mandatory cooldown periods
- [x] Per-site timer and cooldown customization
- [x] Global timer controls for all sites
- [x] Collapsible UI sections for cleaner interface
- [x] True modal blocking with no circumvention

## 📋 Planned Features

### 1. Daily Visit Limits Feature

**Priority: High** - Alternative to time-based restrictions

#### Implementation Steps:

1. **Data Model Setup**

   - [ ] Add visit tracking storage structure (`dailyVisits_[hostname]`)
   - [ ] Store visit count and last reset date
   - [ ] Add visit limit settings (`visitLimit_[hostname]`)

2. **Background Service Worker**

   - [ ] Create visit tracking system in background.js
   - [ ] Implement daily reset logic (midnight reset)
   - [ ] Add message handlers for visit limit operations
   - [ ] Track unique visits (not page refreshes)

3. **Content Script Updates**

   - [ ] Detect when visit limit is reached
   - [ ] Show different modal for visit limits vs timer expiry
   - [ ] Display remaining visits in modal

4. **UI Components**

   - [ ] Add toggle in popup/manage pages (Timer Mode vs Visit Mode)
   - [ ] Create visit limit input fields
   - [ ] Show current visit count and limit
   - [ ] Add "Reset Visits" button for testing

5. **Settings Management**
   - [ ] Allow per-site mode selection (timer or visits)
   - [ ] Global visit limit settings option
   - [ ] Save mode preference per site

### 2. Statistics Dashboard

**Priority: Medium** - Track usage patterns and progress

#### Implementation Steps:

1. **Data Collection**

   - [ ] Create statistics storage structure
   - [ ] Track daily/weekly/monthly usage per site
   - [ ] Record timer completions and cooldown completions
   - [ ] Store visit patterns and peak usage times

2. **Dashboard Page**

   - [ ] Create new statistics.html page
   - [ ] Add navigation from popup and manage pages
   - [ ] Design responsive dashboard layout

3. **Visualizations**

   - [ ] Time spent per site (bar charts)
   - [ ] Usage trends over time (line graphs)
   - [ ] Most visited sites ranking
   - [ ] Success rate (completed timers vs interrupted)
   - [ ] Use Chart.js or similar lightweight library

4. **Export Functionality**
   - [ ] Export data as CSV
   - [ ] Export data as JSON
   - [ ] Generate PDF reports

### 3. Daily/Weekly Limits

**Priority: Medium** - Extended time management

#### Implementation Steps:

1. **Time Tracking**

   - [ ] Track cumulative time per day/week
   - [ ] Store daily and weekly limits
   - [ ] Reset counters at appropriate intervals

2. **Limit Enforcement**

   - [ ] Check limits before starting new timers
   - [ ] Show remaining daily/weekly time
   - [ ] Block access when limits reached

3. **UI Updates**
   - [ ] Add daily/weekly limit inputs
   - [ ] Display progress bars for limits
   - [ ] Show time remaining for the day/week

### 4. Scheduled Blocks

**Priority: Low** - Time-based access control

#### Implementation Steps:

1. **Schedule System**

   - [ ] Create schedule data structure
   - [ ] Support recurring schedules (daily, weekly)
   - [ ] Handle timezone considerations

2. **Block Implementation**

   - [ ] Check current time against schedules
   - [ ] Auto-activate blocks at scheduled times
   - [ ] Override option with password/PIN

3. **Schedule UI**
   - [ ] Create schedule builder interface
   - [ ] Visual calendar/timeline view
   - [ ] Quick presets (work hours, evenings, weekends)

### 5. Website Categorization

**Priority: Low** - Bulk management

#### Implementation Steps:

1. **Category System**

   - [ ] Create predefined categories (Social, News, Entertainment, etc.)
   - [ ] Allow custom categories
   - [ ] Store category assignments

2. **Bulk Operations**

   - [ ] Apply settings to entire categories
   - [ ] Start/stop timers by category
   - [ ] Set limits per category

3. **Auto-Categorization**
   - [ ] Suggest categories for new sites
   - [ ] Import common categorizations
   - [ ] Learn from user corrections

### 6. Export/Import Settings

**Priority: Medium** - Backup and sharing

#### Implementation Steps:

1. **Export Functionality**

   - [ ] Serialize all settings to JSON
   - [ ] Include sites, timers, cooldowns, statistics
   - [ ] Encrypt sensitive data option

2. **Import Functionality**

   - [ ] Parse and validate imported JSON
   - [ ] Merge or replace options
   - [ ] Handle version compatibility

3. **UI Components**
   - [ ] Export button in settings
   - [ ] Import file picker
   - [ ] Preview import changes

### 7. Motivational Features

**Priority: Low** - User engagement

#### Implementation Steps:

1. **Quote System**

   - [ ] Create quote database
   - [ ] Display during cooldowns
   - [ ] Allow custom quotes

2. **Achievement System**

   - [ ] Track milestones (days streak, hours saved)
   - [ ] Visual badges/rewards
   - [ ] Progress notifications

3. **Reminder System**
   - [ ] Custom reminder messages
   - [ ] Contextual tips
   - [ ] Goal setting and tracking

## 🎨 Tailwind CSS Migration

**Priority: Medium** - Modernize styling system

### Phase 1: Setup and Configuration

1. **Development Environment**

   - [ ] Install Tailwind CSS via CDN (Chrome extension compatible approach)
   - [ ] Configure PostCSS build process for production
   - [ ] Set up Tailwind config with extension-specific settings
   - [ ] Add purge configuration to minimize bundle size

2. **Build System Updates**
   - [ ] Create build script to process CSS with Tailwind
   - [ ] Set up watch mode for development
   - [ ] Update manifest.json to include processed CSS
   - [ ] Configure VS Code IntelliSense for Tailwind

### Phase 2: Component Migration Strategy

1. **Migration Plan**

   - [ ] Document current CSS classes and their Tailwind equivalents
   - [ ] Create component mapping (buttons, inputs, modals, etc.)
   - [ ] Plan migration order (least dependent components first)

2. **Core Components First**
   - [ ] Migrate button styles (.start-btn, .stop-btn, .add-btn, etc.)
   - [ ] Convert form inputs and labels
   - [ ] Update spacing and layout utilities
   - [ ] Migrate color palette to Tailwind theme

### Phase 3: Layout Migration

1. **Page Layouts**

   - [ ] Convert popup.html layout to Tailwind grid/flexbox
   - [ ] Migrate manage.html responsive grid system
   - [ ] Update modal and overlay positioning
   - [ ] Convert collapsible sections styling

2. **Component-Specific Styles**
   - [ ] Site item cards (.site-item)
   - [ ] Timer display components
   - [ ] Global controls sections
   - [ ] Status messages and notifications

### Phase 4: Advanced Features

1. **Responsive Design**

   - [ ] Add responsive breakpoints for manage page
   - [ ] Optimize popup sizing across screen sizes
   - [ ] Test on different zoom levels

2. **Animation and Transitions**

   - [ ] Convert CSS animations to Tailwind utilities
   - [ ] Add hover and focus states consistently
   - [ ] Implement micro-interactions (button presses, toggles)

3. **Theme System**
   - [ ] Set up CSS custom properties for themes
   - [ ] Create dark mode variants
   - [ ] Add theme toggle functionality
   - [ ] Implement user preference persistence

### Phase 5: Cleanup and Optimization

1. **Legacy CSS Removal**

   - [ ] Remove old styles.css gradually
   - [ ] Ensure no styling conflicts
   - [ ] Test all components after each removal
   - [ ] Update any hardcoded styles in JavaScript

2. **Performance Optimization**
   - [ ] Minimize final CSS bundle size
   - [ ] Remove unused Tailwind classes
   - [ ] Optimize for Chrome extension constraints
   - [ ] Test loading performance

### Phase 6: Documentation and Standards

1. **Style Guide**

   - [ ] Create component style guide
   - [ ] Document color palette and typography
   - [ ] Establish naming conventions
   - [ ] Create reusable component classes

2. **Development Guidelines**
   - [ ] Update CLAUDE.md with Tailwind information
   - [ ] Create CSS architecture documentation
   - [ ] Add Tailwind best practices for team
   - [ ] Set up linting rules for Tailwind

### Benefits of Migration

- **Consistency**: Unified design system across all components
- **Maintainability**: Utility-first approach reduces custom CSS
- **Responsiveness**: Built-in responsive design utilities
- **Performance**: Smaller CSS bundle with purging
- **Developer Experience**: Better IntelliSense and tooling
- **Future-ready**: Easy to implement themes and variants

### Migration Considerations

- **Bundle Size**: Chrome extension size limits (use purging)
- **Compatibility**: Ensure works with extension CSP policies
- **Build Process**: Keep simple for easy development
- **Fallbacks**: Maintain functionality during transition

## 🐛 Bug Fixes & Improvements

### High Priority

- [ ] Improve timer accuracy during system sleep/wake
- [ ] Handle multiple tabs of same site better
- [ ] Fix any memory leaks from intervals

### Medium Priority

- [ ] Add keyboard shortcuts for common actions
- [ ] Improve modal accessibility (ARIA labels)
- [ ] Better error handling and user feedback

### Low Priority

- [ ] Dark mode support (integrate with Tailwind migration)
- [ ] Custom color themes (part of Tailwind theme system)
- [ ] Animation preferences

## 🧪 Testing Requirements

### Unit Tests

- [ ] Timer calculation functions
- [ ] Storage operations
- [ ] Message passing between components

### Integration Tests

- [ ] Full timer lifecycle
- [ ] Multi-tab scenarios
- [ ] Import/export functionality

### E2E Tests

- [ ] User flows (add site, start timer, cooldown)
- [ ] Edge cases (system sleep, browser restart)
- [ ] Performance under load

## 📚 Documentation

- [ ] API documentation for message passing
- [ ] Contribution guidelines
- [ ] Video tutorials
- [ ] FAQ section

## 🚀 Release Planning

### Version 1.1 (Next Release)

- Daily visit limits feature
- Basic statistics
- Bug fixes

### Version 1.2

- Full statistics dashboard
- Daily/weekly limits
- Export/import settings

### Version 2.0

- Website categorization
- Scheduled blocks
- Achievement system

## 📝 Notes

- Consider Chrome Web Store policies for all features
- Maintain backwards compatibility with settings
- Keep extension size under 10MB
- Ensure all features work offline
