# FISU home page

SvelteKit (Svelte 5) site deployed to Vercel. Package manager: pnpm.

## Development workflow

The local clone is the primary place of work. GitHub only receives changes
that have been verified locally.

1. Make changes locally and try them with `pnpm dev` (http://localhost:5173).
2. Run `pnpm verify` (type check + production build). It must pass.
3. Commit locally. Several commits can pile up before pushing.
4. Push to GitHub only after verification: `git push`.

Rules for Claude:
- Do not push unless the user asks for it, and never push unverified work.
- Before any push, run `pnpm verify` and report the result.
- Do not edit files directly on GitHub (no web-editor commits, no
  `create_or_update_file`/`push_files` API calls); all changes go through
  local commits.

## Commands

- `pnpm install` – install dependencies
- `pnpm dev` – dev server
- `pnpm check` – svelte-check type check
- `pnpm build` – production build (Vercel adapter)
- `pnpm verify` – check + build; the gate before pushing
- `pnpm hooks:install` – once per clone: enables `.githooks/pre-push`,
  which runs `pnpm verify` and aborts the push if it fails

## Configuration

Copy `.env.example` to `.env` for local development. Vercel env vars are set
in Project Settings. API client: `src/lib/server/api/client.ts`.
