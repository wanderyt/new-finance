# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
