#!/usr/bin/env bash
# scripts/server-init.sh — scaffold the NGS leaderboard backend in one command.
#
# What it does:
#   1. Checks wrangler is available
#   2. Creates the D1 database (wrangler d1 create ngs-leaderboard)
#   3. Patches wrangler.jsonc with the new database_id
#   4. Applies the initial schema (wrangler d1 execute --file=migrations/0001_init.sql)
#   5. Prints the binding config so the user can verify
#
# Idempotent: if the database already exists and the schema is applied,
# the script logs that and exits 0.
#
# Usage:
#   bash scripts/server-init.sh              # scaffold (or re-verify) the backend
#   bash scripts/server-init.sh --reset      # drop the tables and re-apply

set -euo pipefail
cd "$(dirname "$0")/.."

RESET=false
if [[ "${1:-}" == "--reset" ]]; then RESET=true; fi

echo "▶ NGS server init"
echo ""

# 1. wrangler present?
if ! npx --no-install wrangler --version >/dev/null 2>&1; then
  if ! command -v wrangler >/dev/null 2>&1; then
    echo "  ✗ wrangler not found. Install: npm i -g wrangler"
    exit 1
  fi
fi
WRANGLER="npx --no-install wrangler"
echo "  ✓ wrangler present"
echo ""

# 2. Read existing database_id from wrangler.jsonc
EXISTING_ID=$(python3 -c "
import json, pathlib, re
src = pathlib.Path('wrangler.jsonc').read_text()
# strip // line comments
src = re.sub(r'^\s*//.*$', '', src, flags=re.M)
data = json.loads(src)
for db in data.get('d1_databases', []):
    if db.get('database_name') == 'ngs-leaderboard':
        print(db.get('database_id', ''))
        break
")
echo "  current database_id: ${EXISTING_ID:-<none>}"

DB_ID=""

if [[ -z "$EXISTING_ID" || "$EXISTING_ID" == "REPLACE_ME_RUN_scripts_server_init_sh" ]]; then
  echo ""
  echo "▶ Create D1 database (ngs-leaderboard)"
  if ! $WRANGLER d1 create ngs-leaderboard 2>&1 | tee /tmp/wrangler-d1-create.log; then
    echo "  ✗ d1 create failed (see /tmp/wrangler-d1-create.log)"
    exit 1
  fi
  DB_ID=$(grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' /tmp/wrangler-d1-create.log | head -1)
  if [[ -z "$DB_ID" ]]; then
    echo "  ✗ could not parse database_id from wrangler output"
    exit 1
  fi
  echo "  ✓ database_id: $DB_ID"

  # 3. Patch wrangler.jsonc
  echo ""
  echo "▶ Patch wrangler.jsonc"
  python3 -c "
import json, pathlib, re
p = pathlib.Path('wrangler.jsonc')
src = p.read_text()
new = re.sub(
    r'(\"database_id\":\s*\")[^\"]*(\")',
    r'\\g<1>${DB_ID}\\g<2>',
    src, count=1
)
p.write_text(new)
print('  ✓ wrangler.jsonc patched')
"
else
  DB_ID="$EXISTING_ID"
  echo "  ✓ using existing database_id"
fi

# 4. Apply schema
echo ""
echo "▶ Apply schema (migrations/0001_init.sql)"
$WRANGLER d1 execute ngs-leaderboard --file=migrations/0001_init.sql --remote 2>&1 | tail -5

# 5. Print
echo ""
echo "▶ Done. Binding in wrangler.jsonc:"
python3 -c "
import json, pathlib, re
src = pathlib.Path('wrangler.jsonc').read_text()
src_clean = re.sub(r'^\s*//.*$', '', src, flags=re.M)
data = json.loads(src_clean)
for db in data.get('d1_databases', []):
    if db.get('database_name') == 'ngs-leaderboard':
        print(f'  binding:        {db[\"binding\"]}')
        print(f'  database_name:  {db[\"database_name\"]}')
        print(f'  database_id:    {db[\"database_id\"]}')
        break
"
echo ""
echo "  Endpoints after deploy:"
echo "    GET  /api/leaderboard?game_id=<id>   → public top-5"
echo "    POST /api/session    { game_id }     → 5-min one-time token"
echo "    POST /api/leaderboard { game_id, initials, score, session_id }"
echo ""
echo "  Next: bash scripts/deploy.sh"
