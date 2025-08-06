# 🎯 reFocus

**Regain control of your attention with mindful browsing timers**

reFocus is a Chrome extension designed to help you maintain focus and develop healthier browsing habits by setting customizable timers for distracting websites. When your time is up, you'll go through a mandatory cooldown period before you can browse again - no shortcuts, no circumvention.

## ✨ Features

### 🕐 **Smart Timer Management**

- Set custom timer durations for any website (minutes and seconds)
- Automatic timer activation when visiting managed sites
- **Tab-aware timing**: Timers pause when you switch tabs and resume when you return
- Persistent settings across browser sessions

### 🛡️ **Focused Experience**

- **True modal blocking**: When time expires, the entire page becomes inaccessible
- **No escape routes**: No circumvention of the timers without friction
- **Mandatory cooldowns**: Enforced break periods before you can browse again
- Focus-trapped modal that can't be dismissed until action is taken

### ⚙️ **Flexible Configuration**

- **In-modal settings**: Configure both timer and cooldown durations when time expires
- **Per-site customization**: Different timer and cooldown settings for each website
- **Persistent preferences**: Your settings are saved and remembered
- Clean, intuitive interface focused on your goals

### 📱 **Intuitive Interface**

- **Popup interface**: Quick access to current site timer controls
- **Management page**: Comprehensive view of all managed sites and their timers
- **Real-time countdown**: See exactly how much time remains
- **Visual feedback**: Clear status indicators for active timers

## 🚀 Installation

### From Chrome Web Store (Coming Soon)

_Extension will be available on the Chrome Web Store_

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The reFocus icon should appear in your toolbar

## 🎮 How to Use

### Adding Websites

1. **Navigate to a distracting website** (e.g., social media, news, etc.)
2. **Click the reFocus extension icon** in your toolbar
3. **Click "Add Current Site"** to add it to your managed sites list
4. **Set your timer and cooldown preferences**

### Managing Your Sites

1. **Click "Manage All Timers"** in the popup to open the management page
2. **Configure individual settings** for each site:
   - **Timer duration**: How long you can browse (minutes/seconds)
   - **Cooldown period**: Mandatory break time after timer expires
3. **Start timers** when you're ready to begin focused browsing

### When Time Expires

1. **Modal appears** blocking all website interaction
2. **Wait for cooldown** to complete (no skipping allowed)
3. **Configure new timer** and cooldown settings in the modal
4. **Start new timer** to continue browsing

## 🔧 Technical Details

### Architecture

- **Manifest V3** Chrome extension
- **Background service worker** for timer management
- **Content scripts** for modal injection and page interaction
- **Chrome Storage API** for persistent data

### Timer System

- **Interval-based countdown** with pause/resume capability
- **Tab visibility detection** for smart pause/resume
- **Persistent state management** across page refreshes
- **Automatic cleanup** of expired timers

### Security Features

- **CSP-compliant** modal creation (no innerHTML)
- **Focus trapping** within modals
- **Event propagation blocking** for true modal behavior
- **Inert attribute support** for accessibility

## 📁 File Structure

```
refocus/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for timer logic
├── content.js            # Content script for modal injection
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── manage.html           # Timer management page
├── manage.js             # Management page functionality
├── styles.css            # Global styles
├── icons/                # Extension icons (16px, 32px, 48px, 128px)
└── README.md             # This file
```

## 🎯 Key Benefits

### For Focus & Productivity

- **Prevents mindless browsing** with intentional time limits
- **Builds awareness** of time spent on distracting sites
- **Creates natural breaks** through mandatory cooldowns
- **Encourages intentional** rather than habitual browsing

### For Digital Wellbeing

- **Reduces endless scrolling** and time-wasting
- **Promotes healthier** online habits
- **Provides accountability** through non-circumventable limits
- **Supports digital detox** goals and mindful browsing

## 🚫 Anti-Circumvention Design

reFocus is specifically designed to prevent common workarounds:

- ❌ **No stop/reset buttons** during active timers
- ❌ **No escape key dismissal** of modals
- ❌ **No background interaction** when modal is active
- ❌ **No timer skipping** or early termination
- ✅ **Mandatory cooldown periods** before new timers
- ✅ **True modal blocking** with focus trapping
- ✅ **Persistent state** across page refreshes

## 🔮 Future Enhancements

- [ ] **Statistics dashboard** showing usage patterns
- [ ] **Daily/weekly limits** in addition to per-session timers
- [ ] **Scheduled blocks** for specific times of day
- [ ] **Website categorization** for bulk timer management
- [ ] **Export/import settings** for backup and sharing
- [ ] **Motivational quotes** or reminders during cooldowns

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

1. Clone the repository
2. Make your changes
3. Test thoroughly in Chrome's developer mode
4. Submit a pull request with clear description

### Areas for Contribution

- 🐛 **Bug fixes** and stability improvements
- 💡 **Feature suggestions** and implementations
- 🎨 **UI/UX enhancements** and design improvements
- 📚 **Documentation** improvements and examples
- 🧪 **Testing** and quality assurance

## 📄 License

This project is open source. Feel free to use, modify, and distribute as needed.

## 🙏 Acknowledgments

Built with focus, determination, and a commitment to helping others reclaim their attention in our distracted digital world.

---

**Take back control. Stay focused. reFocus your time.** 🎯
