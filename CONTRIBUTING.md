# Contributing

## Development workflow

1. Use Node.js 22.22 or newer. Run `npm ci` and `npx playwright install chromium`.
2. Create a branch from `main` and make a focused change.
3. Run `npm run dev` and refresh the browser to see edits.
4. Stop the dev server, run `npm run format`, then `npm run check`.
5. Open a pull request describing the problem, resulting behavior, and verification.

Include screenshots for visible changes and explain any checks you could not run. Check narrow and wide layouts, keyboard navigation, reduced motion, and a complete cycle. Do not include dependencies, build output, recordings, secrets, or incidental temporary files. Commit `package-lock.json` when dependencies change; CI uses `npm ci`.

## Code conventions

- Keep application source in strict TypeScript. Do not use `any`, suppressed errors, or unjustified assertions.
- Order files as imports, blank line, interfaces/types, blank line, constants and implementation. Keep distinct declarations separated by blank lines.
- Keep `src/core` independent of DOM and Node APIs; `tsconfig.core.json` enforces this. Browser adapters live in `src/browser`.
- Change simulation state through its commands. Public state is a read-only live view, not a saved snapshot.
- Controls emit actions through callbacks; the application coordinates simulation, rendering, and scheduling. Keep imports free of startup side effects except `src/main.ts`.
- Keep frame scheduling idempotent and disposal safe to call twice. Add lifecycle tests for new resources. See [architecture decisions](docs/architecture.md).
- Use shared CSS custom properties for reusable visual values. Isolate decorative SVG geometry.
- Keep runtime dependency-free. Development dependencies are allowed.
- Use native controls with visible focus and labels. Honor reduced motion.
- Dispose of event listeners, scheduled frames, and any added timers.
- Write behavior tests for numerical or lifecycle changes. Avoid assertions that simply repeat implementation formulas.

Prettier and ESLint enforce formatting, unused-code checks, TypeScript conventions, and import placement. TypeScript checks source, scripts, and tests. The browser suite uses Chromium against the production build, including offline loading and responsive layouts.

## Pull requests

Keep documentation consistent with behavior. Report tests and relevant browser versions; do not claim accessibility conformance or deployment success without verification. CI must pass before merging. Changes to deployment permissions or action revisions should explain why they are needed. Update pinned action SHAs deliberately using the upstream action repository.
