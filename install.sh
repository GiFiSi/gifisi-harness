#!/usr/bin/env bash
# poteto-harness installer. Thin wrapper around scripts/sync-harnesses.mjs.
#   ./install.sh --project <path> [--dry-run]   install into a project (brownfield-safe, idempotent)
#   ./install.sh --global [--home <dir>] [--dry-run]   install into ~/.claude, ~/.codex and ~/.cursor
#   ./install.sh -h
set -euo pipefail

usage() {
  cat <<'USAGE'
poteto-harness installer

  ./install.sh --project <path> [--dry-run]
      Copy the harness into <path>/.poteto/, detect the stack into .poteto/project.json,
      and splice the router into AGENTS.md, CLAUDE.md and .cursor/rules/poteto-harness.mdc.
      Existing files keep every byte outside the managed markers.

  ./install.sh --global [--home <dir>] [--dry-run]
      Copy the harness into <dir>/.poteto-harness/ (default dir: $HOME) and splice the router
      into <dir>/.claude/CLAUDE.md, <dir>/.codex/AGENTS.md and <dir>/.cursor/rules/poteto-harness.mdc.

  Running either mode twice changes nothing the second time (writes=0).
USAGE
}

die() {
  echo "install.sh: $*" >&2
  exit 1
}

to_native() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    printf '%s\n' "$1"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_DIR="$(to_native "$SCRIPT_DIR")"

if ! command -v node >/dev/null 2>&1; then
  die "Node.js >= 18 is required and 'node' is not on PATH. Install it from https://nodejs.org and retry."
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
  die "Node.js >= 18 is required; found $(node --version 2>/dev/null || echo unknown)."
fi

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

ARGS=()
MODE=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --project)
      [ "$#" -ge 2 ] || die "--project needs a path"
      [ -z "$MODE" ] || die "choose one of --project or --global"
      MODE="project"
      ARGS+=("--project" "$(to_native "$2")")
      shift 2
      ;;
    --global)
      [ -z "$MODE" ] || die "choose one of --project or --global"
      MODE="global"
      ARGS+=("--global")
      shift
      ;;
    --home)
      [ "$#" -ge 2 ] || die "--home needs a directory"
      ARGS+=("--home" "$(to_native "$2")")
      shift 2
      ;;
    --dry-run)
      ARGS+=("--dry-run")
      shift
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
done

[ -n "$MODE" ] || die "choose --project <path> or --global"

exec node "$SCRIPT_DIR/scripts/sync-harnesses.mjs" "${ARGS[@]}"
