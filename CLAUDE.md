# Project: new-finance

## Project Overview

A Next.js 16 application built with React 19, TypeScript, and Tailwind CSS 4.

## Component Structure

Components are organized by feature and purpose:

```
app/components/
├── login/          # Login-related UI components
├── dashboard/      # Dashboard-related UI components
└── ui-kit/         # Shared/reusable UI components
```

### Guidelines

- **Feature-based organization**: Place components in folders by feature (e.g., `login/`, `dashboard/`)
- **UI Kit components**: Store reusable components (buttons, inputs, etc.) in `ui-kit/`
- **Imports**: Use relative paths (e.g., `../ui-kit/Button`) when importing between folders
- **Consistency**: All feature components should use UI kit components for consistency

## Environment Requirements

- **Node.js**: >= 20.9.0 (use `nvm use` to auto-switch via `.nvmrc`)
- **Package Manager**: Yarn 4.5.3 (Berry) — enforced via `packageManager` field in `package.json`
- **Enable Corepack**: Run `corepack enable` to use the correct Yarn version

## Development Commands

```bash
yarn dev      # Start development server
yarn build    # Build for production
yarn start    # Start production server
yarn lint     # Run ESLint
```

## Version Management

```bash
yarn version:patch   # Bump patch version (0.1.0 -> 0.1.1)
yarn version:minor   # Bump minor version (0.1.0 -> 0.2.0)
yarn version:major   # Bump major version (0.1.0 -> 1.0.0)
```

## Commit Convention

Use conventional commit format for clear changelog generation:

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, no logic change)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

Example: `feat: add user authentication flow`

## PR Checklist

Before merging a PR, ensure:

- [ ] All tests pass (if applicable)
- [ ] Code has been linted (`yarn lint`)
- [ ] **Run the changelog command**: Use `/changelog` Claude command to generate changelog entry
- [ ] Version has been bumped appropriately (`yarn version:patch|minor|major`)
- [ ] `CHANGELOG.md` has been updated with the new entry

## Changelog Workflow

1. Make your changes on a feature branch
2. Before creating/merging PR, run the `/changelog` Claude command
3. Claude will analyze changes against `main` branch and update `CHANGELOG.md`
4. Bump the version using the appropriate `yarn version:*` script
5. Commit the changelog and version bump
6. Create/merge the PR

## Design Docs

**Before implementing any feature or making architectural decisions, read the relevant design doc(s) below.** They capture decisions, constraints, and implementation details that are not obvious from the code alone.

### Core Architecture
- [Authentication Flow](docs/authentication-flow.md) — session/cookie auth design, login flow
- [Cookie Auth in Docker](docs/cookie-authentication-docker.md) — how auth cookies behave in Docker environments
- [Redux Implementation Plan](docs/redux-implementation-plan.md) — state management structure and patterns
- [Database Setup](docs/database-setup.md) — DB schema, connection, and setup

### Features
- [Receipt Analysis AI](docs/receipt-analysis-ai-implementation.md) — AI-powered receipt parsing implementation
- [Item Name Standardization](docs/item-name-standardization-feature.md) — context-aware item name normalization logic
- [Item Price Trend](docs/item-price-trend-feature.md) — price trend tracking per item
- [Item Unit Price](docs/item-unit-price-feature.md) — unit price calculation and display
- [Fin Editor](docs/fin-editor-feature.md) — financial record editor UX and logic
- [Fin Auto-Populate](docs/fin-auto-populate-feature.md) — auto-fill behavior for fin records
- [History Search](docs/history-search-feature.md) — search/filter design for transaction history
- [Charts & Analytics](docs/charts-analytics-feature.md) — charting data model and rendering approach
- [Pocket Money](docs/pocket-money-feature.md) — pocket money tracking feature design

### API & Data
- [Fin Create/Update API](docs/api-implementation-fin-create-update.md) — REST API contracts for financial records
- [Fin Records Migration](docs/migration-fin-records.md) — data migration strategy and scripts

### UI & Branding
- [Dashboard UI Design](docs/dashboard-ui-design.md) — layout, component hierarchy, and UX patterns
- [Branding](docs/branding.md) — colors, typography, logo usage

### Infrastructure & Deployment
- [Docker Deployment](docs/docker-deployment.md) — containerization and deployment setup
- [Docker Hub Deployment](docs/docker-hub-deployment.md) — publishing images to Docker Hub
- [Docker Startup Fixes](docs/docker-startup-fixes.md) — known startup issues and workarounds
- [Synology Docker Permissions Fix](docs/synology-docker-permissions-fix.md) — NAS-specific permission issues
- [Performance Testing](docs/PERFORMANCE_TESTING.md) — load testing approach and benchmarks

## Keeping Design Docs Up to Date

**Any time you change a feature, you must also update its design doc.** If the relevant doc doesn't exist yet, create one under `docs/`.

### When to update an existing doc
- A requirement or behavior changes (e.g. new edge case, revised logic, changed API contract)
- A UX or data model decision is revised
- A known limitation or workaround is added or resolved

Update only the sections that changed — don't rewrite the whole doc. Reflect the current state accurately so future agents can rely on it.

### When to create a new doc
- The work introduces a brand new feature with non-obvious design decisions
- Name the file `docs/<feature-name>-feature.md` (or `docs/<topic>.md` for infrastructure/API topics)
- Add a one-line entry for it in the Design Docs section of this file

### Doc structure (for new docs)
```markdown
# <Feature Name>

## Overview
What this feature does and why it exists.

## Design Decisions
Key choices made and the reasoning behind them.

## Implementation Details
How it works: data flow, key files, edge cases.

## Known Limitations / Future Work
Anything deferred or worth revisiting.
```
