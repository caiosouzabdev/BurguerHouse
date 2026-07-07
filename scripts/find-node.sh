#!/bin/sh
# Finds Node.js on PATH or common install locations (Windows Git Bash, macOS, Linux).

find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  for candidate in \
    "/c/Program Files/nodejs/node.exe" \
    "/c/Program Files (x86)/nodejs/node.exe" \
    "$LOCALAPPDATA/Programs/nodejs/node.exe" \
    "$HOME/AppData/Local/Programs/nodejs/node.exe" \
    "/usr/local/bin/node" \
    "/opt/homebrew/bin/node"
  do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}
