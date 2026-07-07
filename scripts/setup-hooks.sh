#!/bin/sh
# Install git hooks. Usage: ./scripts/setup-hooks.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git config core.hooksPath .githooks
echo "Git hooks installed (.githooks/pre-commit will run tests before each commit)."
