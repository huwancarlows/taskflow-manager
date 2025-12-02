# TaskFlow Manager (Web)

A polished, accessible task board built with Next.js 16, React 19, and Tailwind CSS v4. It features a fast local-first store with persistence, a keyboard-driven command palette, accessible modal and announcements, drag-and-drop and keyboard reordering, and helpful toasts.

## Features

- Task board: backlog, in progress, done; drag-and-drop between columns
- Local persistence: tasks and labels saved to `localStorage`
- Labels and filters: toggle labels, filter by All/Today/Upcoming, full-text search
- Command palette: Ctrl/⌘ K to create tasks, set filters, toggle labels, or search
- Keyboard support:
	- `N`: new task
	- `/`: focus search
	- `T`/`U`: filter Today/Upcoming
	- `Alt+Arrow` keys: reorder and move tasks across columns
- Undo delete: toast “Undo” restores the removed task at its prior position
- Toasts: feedback on create/update/delete and filter/label actions
- Accessibility: ARIA-compliant modal with portal + focus trap; aria-live announcements for moves/filters/search; background hidden from AT while dialogs are open
- Tailwind v4-safe utilities: static class maps for label colors, modern styles

## Screenshots

Place screenshots in `public/screenshots/` and reference them here. Example:

![Board view](public/screenshots/board.png)
![New task modal](public/screenshots/new-task.png)

## Quick Start

Requirements: Node.js 20+, npm 9+

Windows PowerShell commands:

```powershell
# from the project root
npm install
npm run dev
# open http://localhost:3000
```

Common scripts:

- `npm run dev`: start Next.js in development
- `npm run build`: production build
- `npm start`: start production server (after build)
- `npm run lint`: run ESLint
- `npm run typecheck`: type-check with TypeScript

## Deploy

Vercel (recommended):

1. Push this project to a GitHub repository.
2. Import the repo in Vercel and select the Next.js framework preset.
3. Deploy with defaults; no extra env variables required for the client-only MVP.

Self-host:

```powershell
npm install
npm run build
npm start
# serves on http://localhost:3000
```

## CI

This repo includes a GitHub Actions workflow that runs on push/PR:

- Install dependencies with Node 20
- Lint (ESLint)
- Type-check (tsc --noEmit)
- Build (next build)

See `.github/workflows/ci.yml`.

## Tech Stack

- Next.js 16 (App Router), React 19
- Tailwind CSS v4
- TypeScript 5, ESLint 9

## Accessibility Highlights

- Modal dialog rendered in a portal with `role="dialog"`, `aria-modal`, `aria-labelledby`
- Focus trap and focus restore on dialog close
- Background subtree is set `aria-hidden` while dialog is open
- Live region announcements for task moves, filter/label changes, and search updates

## Project Structure

```
src/
	app/
		page.tsx        # App shell and providers
		globals.css     # Theme + base styles
	components/
		TaskBoard.tsx   # Columns + DnD
		TaskCard.tsx    # Task item
		TaskModal.tsx   # Create/edit modal (portal)
		FiltersBar.tsx  # Search + filter chips
		CommandPalette.tsx # Ctrl/⌘ K palette
		ToastProvider.tsx  # Toasts + aria-live
		Announcer.tsx   # Polite live region
	store/
		taskStore.tsx   # Local store + persistence
	types.ts          # Types and constants
```

## Troubleshooting

- Port 3000 already in use: stop the other process or set `PORT=3001` when running dev/start.
- Lint errors: run `npm run lint` to see details; fix before committing.
- Windows path issues: run commands from the project root folder.
