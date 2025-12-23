# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-12-22

### Added
- Complete authentication API implementation with three endpoints:
  - POST /api/auth/login - Validates credentials and sets HttpOnly session cookie
  - GET /api/auth/verify - Validates session from cookie server-side
  - POST /api/auth/logout - Clears authentication cookie
- Mock user database with three test users (demo, john_doe, jane_smith)
- Session token utilities using Base64 encoding (easy migration to JWT)
- Cookie management with proper security flags (HttpOnly, Secure, SameSite)
- Redux async thunks for login, session verification, and logout
- Global loading component with configurable sizes and full-screen mode
- AuthProvider component for automatic session verification on app load
- Full-screen loading UI during session verification ("Verifying session...")
- isVerifying state in Redux to track initial session verification
- Error handling and loading states in LoginForm and Dashboard
- Demo credentials info box in login form
- Axios dependency for improved HTTP request handling

### Changed
- LoginForm now uses loginAsync thunk instead of synchronous login action
- Dashboard logout uses logoutAsync thunk with proper API integration
- AuthProvider always calls verify API (HttpOnly cookies can't be read by JS)
- Updated metadata in layout with proper title and description
- Enhanced authentication flow documentation with implementation status

### Fixed
- Session persistence on page refresh now works correctly
- HttpOnly cookies properly set on NextResponse objects in API routes
- Cookie verification works without client-side cookie access

### Technical
- Authentication cookies set with 7-day expiration
- Base64-encoded session tokens (mock implementation, production-ready for JWT)
- Plain text password validation (mock implementation, production-ready for bcrypt)
- Server-side cookie validation in verify endpoint
- TypeScript interfaces for all API requests and responses
- Clear migration path to production authentication documented

## [0.3.0] - 2025-12-22

### Added
- Redux Toolkit state management for authentication
- Typed Redux hooks (useAppDispatch, useAppSelector, useAppStore)
- Redux Provider with Next.js 16 App Router integration
- Auth slice with login/logout reducers and selectors
- Comprehensive authentication flow documentation
- Redux implementation plan documentation
- Dependencies: @reduxjs/toolkit (^2.11.2), react-redux (^9.2.0)

### Changed
- LoginForm now dispatches Redux actions instead of callback props
- Dashboard uses Redux selectors for state access
- Removed prop drilling between page.tsx and child components
- Centralized authentication state in Redux store

### Technical
- Feature-based Redux organization (app/lib/redux/features/)
- Full TypeScript support with RootState and AppDispatch types
- Redux DevTools integration enabled in development
- useRef pattern for store instance in Next.js App Router

## [0.2.0] - 2025-12-22

### Added
- Mobile-first login UI with username/password authentication flow
- Dashboard component with user welcome, stats cards, and activity feed
- Animated page transitions between login and dashboard using framer-motion
- Reusable UI kit components (Button and Input) for consistent styling
- Feature-based component organization structure (login/, dashboard/, ui-kit/)
- Component structure guidelines in CLAUDE.md
- Yarn PnP SDK setup for improved editor integration

### Changed
- Reorganized components into feature-based folders
- Refactored LoginForm and Dashboard to use UI kit components
- Configured Yarn to use node-modules linker for Turbopack compatibility

## [0.1.1] - 2025-12-22

### Added
- Claude Code `/changelog` command for automated changelog generation
- Claude Code `/create_pr` command for automated PR workflow (version bump, changelog, commit, PR creation)
- Project documentation in [CLAUDE.md](CLAUDE.md) with development guidelines
- GitHub pull request template for standardized PRs
- Node.js version management via [.nvmrc](.nvmrc) file
- Yarn 4 (Berry) as package manager with version scripts

### Changed
- Migrated from npm to Yarn 4 for package management
- Updated [.gitignore](.gitignore) for Yarn-specific files

### Fixed
- Added required frontmatter to changelog command for proper Claude Code recognition

## [0.1.0] - 2024-12-22

### Added
- Initial Next.js 16 project setup
- React 19 with TypeScript
- Tailwind CSS 4 integration
- ESLint configuration
