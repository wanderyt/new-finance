# Branding & Icons

This document describes the branding assets for the New Finance application.

## App Icons

### Primary Color
- **Green**: `#10B981` (Emerald 500)
- Represents: Growth, prosperity, financial health

### Icon Files

#### [app/icon.svg](../app/icon.svg)
- **Size**: 64x64px
- **Usage**: Browser favicon, PWA icon
- **Design**: Circular green background with white dollar sign and subtle chart segments
- **Format**: SVG (automatically converted by Next.js to various sizes)

#### [app/apple-icon.svg](../app/apple-icon.svg)
- **Size**: 180x180px
- **Usage**: Apple Touch Icon (iOS home screen, Safari pinned tabs)
- **Design**: Rounded rectangle background (40px radius) with larger dollar sign
- **Format**: SVG with rounded corners for iOS styling

#### [app/opengraph-image.svg](../app/opengraph-image.svg)
- **Size**: 1200x630px (standard OG image size)
- **Usage**: Social media previews (Twitter, Facebook, LinkedIn, Slack, etc.)
- **Design**: Gradient background with large icon, app name, and feature tags
- **Features displayed**: Track Expenses, AI Analysis, Dashboard

## Icon System

Next.js 16 automatically handles icon generation from the SVG files:

1. **Favicon Generation**: `icon.svg` → multiple favicon sizes (16x16, 32x32, etc.)
2. **Apple Touch Icon**: `apple-icon.svg` → iOS home screen icon
3. **Open Graph**: `opengraph-image.svg` → Social media link previews

### Metadata Configuration

Icons are configured in [app/layout.tsx](../app/layout.tsx):

```typescript
export const metadata: Metadata = {
  title: "New Finance - Secure Financial Management",
  description: "Modern financial management platform with secure authentication",
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
};
```

## Design Elements

### Dollar Sign Symbol
- Represents: Core finance/money management functionality
- Style: Bold, clean lines
- Color: White (high contrast on green background)

### Chart Segments
- Represents: Financial tracking and analytics
- Style: Subtle, semi-transparent arcs
- Purpose: Adds visual interest without overwhelming the primary symbol

### Typography
- **Font**: System UI / San Francisco (platform-native fonts)
- **Weight**: Bold for title, regular for subtitle
- **Color**: White with varying opacity for hierarchy

## Usage Guidelines

### Do's
- Use the SVG versions for all web contexts (they scale perfectly)
- Maintain the green color scheme (`#10B981`) for brand consistency
- Ensure sufficient contrast when placing on backgrounds

### Don'ts
- Don't modify the icon proportions or aspect ratio
- Don't use different colors without brand approval
- Don't add additional elements to the core icon design

## Browser Support

All modern browsers support SVG favicons:
- ✅ Chrome 80+
- ✅ Firefox 41+
- ✅ Safari 14+
- ✅ Edge 79+

For older browsers, Next.js automatically generates PNG fallbacks.

## Testing Icons

### Local Development
1. Start dev server: `yarn dev`
2. Open `http://localhost:3000` in browser
3. Check browser tab for favicon
4. Check browser bookmarks for icon
5. On iOS Safari: Add to Home Screen to test Apple Touch Icon

### Production
1. Build and deploy: `yarn build && yarn start`
2. Verify icons at production URL
3. Test social sharing with [OpenGraph Preview](https://www.opengraph.xyz/)

## Social Media Previews

When sharing your app URL, social platforms will use the Open Graph image:

### Preview URLs
- **Twitter**: Tweet a link to see the card preview
- **Facebook**: Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **LinkedIn**: Share a link to see preview
- **Slack**: Paste a link to see unfurled preview

### Troubleshooting
If social platforms don't show the new image:
1. Clear their cache using platform-specific tools (e.g., Facebook Debugger)
2. Verify `opengraph-image.svg` is accessible at `https://yourdomain.com/opengraph-image.svg`
3. Check browser console for errors

## File Sizes

- `icon.svg`: ~1KB
- `apple-icon.svg`: ~1KB
- `opengraph-image.svg`: ~3KB

Total branding assets: ~5KB (minimal impact on page load)

## Future Enhancements

Potential improvements to consider:
- [ ] Add PWA manifest.json for installable web app
- [ ] Create animated icon for loading states
- [ ] Design dark mode variant of icons
- [ ] Add Windows tile images for Microsoft Store
- [ ] Create branded email signature graphics

---

**Last Updated:** 2026-01-12
**Designer:** Generated for new-finance application
