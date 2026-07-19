# pi-qwencloud-provider — justfile
# Wraps the package.json scripts. `just` requires explicit dependencies between
# recipes; list them in the recipe signature to run in order.

# List available recipes.
default:
    @just --list

# Run unit tests (vitest run).
test:
    npm run test

# Watch mode for tests.
test-watch:
    npm run test:watch

# Lint src/ and tests/ with oxlint.
lint:
    npm run lint

# Type-check via tsc (noEmit).
typecheck:
    npm run typecheck

# Check formatting with oxfmt.
format-check:
    npm run format:check

# Format src/ and tests/ with oxfmt.
format:
    npm run format

# Full verification: lint, typecheck, then test.
check: lint typecheck test

# Release helpers (bumpp → commit + tag + push to main).
release-patch:
    npm run release:patch

release-minor:
    npm run release:minor

release-major:
    npm run release:major

# Publish to npm.
pub:
    npm run pub
