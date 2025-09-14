# reFocus Chrome Extension - Technical Documentation

## Project Overview
reFocus is a Chrome extension that helps users manage their time on distracting websites through customizable timers and mandatory cooldown periods. Built with Manifest V3.

## Architecture

### Core Components

1. **background.js** - Service worker that manages timer state and countdown logic
   - Uses interval-based countdown (checks every second)
   - Stores timer state in chrome.storage.local
   - Handles messages: START_TIMER, STOP_TIMER, PAUSE_TIMER, RESUME_TIMER
   - Timer data structure: `{ isActive, isPaused, remainingMs, totalMs, lastUpdate }`

2. **content.js** - Injected into managed sites to show blocking modal
   - Shows modal when timer expires
   - Handles cooldown periods
   - Prevents page interaction during cooldown

3. **popup.html/js** - Extension popup interface
   - Shows current site status
   - Allows adding current site to managed list
   - Quick timer controls for current site
   - Link to management page

4. **manage.html/js** - Full management interface
   - Add/remove sites manually
   - Configure timer and cooldown durations per site
   - Start/stop timers for each site
   - Shows active timer countdowns

## Key Features

### Timer System
- **Per-site timers**: Each website has individual timer and cooldown settings
- **Global timer control**: Start all site timers simultaneously with uniform settings
- **Tab-aware**: Timers pause when tab loses focus, resume when regained
- **Persistent state**: Timer state survives page refreshes
- **No circumvention**: No way to skip cooldowns or stop active timers
- **Collapsible UI**: Global controls hidden by default, expandable on demand

### Data Storage
- Uses `chrome.storage.local` for persistence
- Settings stored with format: `settings_[hostname]`
- Timer state stored with hostname as key
- Cooldown settings stored as: `cooldownSettings_[hostname]`

## Timer Flow
1. User starts timer for a site
2. Background script creates interval-based countdown
3. Timer updates every second if not paused
4. When timer expires, content script shows blocking modal
5. Cooldown period begins (non-skippable)
6. After cooldown, user can set new timer

## Message Types
- `START_TIMER`: Begin timer with duration
- `STOP_TIMER`: Clear timer (only from manage page)
- `PAUSE_TIMER`: Pause when tab loses focus
- `RESUME_TIMER`: Resume when tab gains focus
- `TIMER_EXPIRED`: Sent to content script when time's up
- `OPEN_POPUP`: Open extension popup programmatically

## Global Timer Feature
- **Popup interface**: Collapsible section with timer/cooldown inputs
- **Management interface**: Expanded controls for bulk operations
- **Functionality**: Sets uniform timer and cooldown for all managed sites
- **UI behavior**: Hidden by default, click header to expand with chevron indicator

## Helper Functions
- `cleanHostname()`: Normalizes URLs (removes protocol, www, paths)
- `formatTime()`: Converts milliseconds to MM:SS format
- `startTimerCountdown()`: Begins interval-based countdown
- `handleTimerExpired()`: Processes timer completion

## Current Limitations
- Only time-based restrictions (no visit-count limits)
- No statistics or usage tracking
- No daily/weekly cumulative limits
- Settings are per-device (not synced)

## Planned Features
- **Daily visit limits**: Alternative to timers - limit number of visits per day per site
- **Statistics dashboard**: Track usage patterns, time saved, success rates
- **Scheduled blocks**: Time-based access restrictions (work hours, etc.)
- **Website categorization**: Group sites and apply bulk settings
- **Export/import settings**: Backup and share configurations

## Testing Commands
No automated tests currently configured. Manual testing required through Chrome extension developer mode.

## Development Notes
- Extension uses Manifest V3 (required for Chrome Web Store)
- No external dependencies (vanilla JavaScript)
- CSP-compliant modal creation (no innerHTML for security)
- Focus trapping implemented for accessibility