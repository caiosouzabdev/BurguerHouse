#!/bin/sh
# Run unit tests without npm. Usage: ./scripts/test.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

. "$ROOT/scripts/find-node.sh"

NODE="$(find_node)" || {
  echo "Node.js not found. Install from https://nodejs.org"
  echo "Or add Node to your PATH and try again."
  exit 1
}

echo "Using: $NODE"
exec "$NODE" scripts/run-tests.mjs
