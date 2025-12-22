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
