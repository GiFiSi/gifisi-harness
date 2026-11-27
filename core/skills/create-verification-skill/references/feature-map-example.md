# Feature map example: cart service

This is a complete worked example of `core/skills/create-verification-skill/SKILL.md` applied to a small Node HTTP service. The app is the same shape as the one the harness smoke test builds: a server with `/health` and `/api/cart/total`, a cart module, and a coupon feature that does not exist yet. The example shows the map, the verify notes, the runs before and after the fix, and the decision log rows.

## The app

- `package.json` has `"type": "module"`, `"start": "node src/server.mjs"`, and `"test": "node --test test/"`.
- `src/server.mjs` reads the port from `PORT`. `GET /health` answers `200 {"ok":true}`. `GET /api/cart/total?items=10,5[&coupon=CODE]` answers `{"total": <number>, "currency": "USD"}`.
- `src/cart.mjs` sums the items. It has a bug: the items come from the query string as strings, so `items.reduce((sum, p) => sum + p, 0)` returns `"0105"` for `10,5`.
- The `coupon` parameter is ignored. `SAVE10` should take 10% off, so `10,5` with `SAVE10` should total `13.5`.

## Interview answers

- **Surface:** an HTTP JSON API. No browser UI, no CLI.
- **Run:** `node src/server.mjs` with `PORT` set. No database, no auth, no seed data.
- **Drive:** plain HTTP requests. There is no existing end-to-end harness.
- **Observe:** status code and JSON body.
- **Isolate:** yes. Each run gets its own port, and the app keeps no state on disk.

## The map: `.gifisi/feature-map.json`

```json
{
  "app": {
    "start": ["node", "src/server.mjs"],
    "cwd": ".",
    "portEnv": "PORT",
    "readyPath": "/health",
    "timeoutMs": 15000
  },
  "features": [
    {
      "id": "health",
      "description": "An operator can see that the service is up and ready.",
      "surface": "http",
      "checks": [
        {
          "name": "reports ready",
          "request": { "method": "GET", "path": "/health" },
          "expect": { "status": 200, "json": { "ok": true } }
        }
      ]
    },
    {
      "id": "cart-total",
      "description": "A shopper sees the numeric total of the prices in the cart.",
      "surface": "http",
      "checks": [
        {
          "name": "sums numeric prices",
          "request": { "method": "GET", "path": "/api/cart/total?items=10,5" },
          "expect": { "status": 200, "json": { "total": 15, "currency": "USD" } }
        },
        {
          "name": "rejects a non-numeric price",
          "request": { "method": "GET", "path": "/api/cart/total?items=10,abc" },
          "expect": { "status": 400 }
        }
      ]
    },
    {
      "id": "coupon",
      "description": "A shopper who enters SAVE10 pays 10% less.",
      "surface": "http",
      "checks": [
        {
          "name": "SAVE10 takes 10% off",
          "request": { "method": "GET", "path": "/api/cart/total?items=10,5&coupon=SAVE10" },
          "expect": { "status": 200, "json": { "total": 13.5, "currency": "USD" } }
        }
      ]
    }
  ]
}
```

Why each choice:

- `readyPath` is `/health`, which only answers once the router is mounted. The script polls it until it gets a 2xx or `timeoutMs` runs out.
- `total` is pinned to the number `15`. A substring check such as `bodyIncludes: "15"` would also pass on a wrong total like `150` or `115`. Pin exact values.
- The rejected-input check exists because the root-cause fix parses prices at the boundary, and a parse needs a defined failure.
- `coupon` is mapped before it exists. Its check must fail first. That failure is the evidence that the check can fail.

## The verify notes: `<project>/.gifisi/verify/README.md`

```markdown
# Verify the cart service

## Launch
Run `node .gifisi/scripts/verify-feature-map.mjs` from the project root. It starts
`node src/server.mjs` on a free port, waits for `GET /health` to answer 200,
runs every check, and stops the server. To drive by hand, run
`PORT=4310 node src/server.mjs` (PowerShell: `$env:PORT=4310; node src/server.mjs`)
and wait for `GET http://127.0.0.1:4310/health`
to return `{"ok":true}`. Stop it with Ctrl+C in the same terminal.

## Doctor
`GET /health` returns 200 with `{"ok":true}` on the port this run chose.
If the port answers but you did not start the process, do not drive it.

## Drive
- Cart total: `GET /api/cart/total?items=10,5`. Prices are a comma list.
- Coupon: add `&coupon=SAVE10`. Codes are upper case.

## Evidence
Save the script output with `node .gifisi/scripts/verify-feature-map.mjs --json`
to `.gifisi/verify/evidence/<feature-id>/<UTC timestamp>.json`.
Cleanup never deletes this directory.

## Cleanup
The script kills the server it started, also on failure. After a manual run,
stop only the process you started, by its PID, never by process name.

## Gotchas
- cart-total: a total of "0105" means the prices were concatenated as strings.
- coupon: an unknown code is ignored, not rejected. Do not assert a 400 for it.
```

## Before: reproduce on the live surface

`node scripts/verify-feature-map.mjs` before any code change. The rows below show the shape of the output; the exact wording of the detail column comes from the script.

```text
feature    | check                       | result | detail
health     | reports ready               | PASS   | status 200
cart-total | sums numeric prices         | FAIL   | json.total expected 15, got "0105"
cart-total | rejects a non-numeric price | FAIL   | status expected 400, got 200
coupon     | SAVE10 takes 10% off        | FAIL   | json.total expected 13.5, got "0105"
features=3 checks=4 passed=1 failed=3
```

The script exits 1. Each FAIL names the wrong value, so the row is the reproduction. Log it:

```text
node scripts/log-decision.mjs reproduce "cart-total returns string concat" "live check before fix" "verify-feature-map cart-total sums numeric prices FAIL got 0105" "bug confirmed"
```

## Root cause

The first wrong state is in `src/cart.mjs`: the prices enter the sum as strings. A guard in the server such as `Number(total)` would hide the symptom and still accept `abc`. The fix parses every price with `Number()` at the boundary, rejects any value that is not finite with a 400, and sums numbers. A failing unit test, `test/cart-total.test.mjs`, is written and observed failing before the fix.

## After the bug fix

```text
feature    | check                       | result | detail
health     | reports ready               | PASS   | status 200
cart-total | sums numeric prices         | PASS   | status 200
cart-total | rejects a non-numeric price | PASS   | status 400
coupon     | SAVE10 takes 10% off        | FAIL   | json.total expected 13.5, got 15
features=3 checks=4 passed=3 failed=1
```

The coupon row now fails for its own reason: the feature does not exist. The bug fix did not hide it.

## After the coupon feature

A coupons table in `src/coupons.mjs` maps `SAVE10` to a 10% discount, and the server applies it after the sum.

```text
feature    | check                       | result | detail
health     | reports ready               | PASS   | status 200
cart-total | sums numeric prices         | PASS   | status 200
cart-total | rejects a non-numeric price | PASS   | status 400
coupon     | SAVE10 takes 10% off        | PASS   | status 200
features=3 checks=4 passed=4 failed=0
```

The script exits 0. Log it:

```text
node scripts/log-decision.mjs verify "cart-total and coupon pass live" "same checks that failed before" "verify-feature-map passed=4 failed=0" "pass"
```

## Resulting `.gifisi/decisions.tsv` rows

```text
ts	phase	decision	why	evidence	result
2026-11-26T14:02:11Z	reproduce	cart-total returns string concat	live check before fix	verify-feature-map cart-total sums numeric prices FAIL got 0105	bug confirmed
2026-11-26T14:19:40Z	verify	cart-total and coupon pass live	same checks that failed before	verify-feature-map passed=4 failed=0	pass
```

The timestamps are illustrative. `scripts/log-decision.mjs` writes the real UTC time.

## Other surfaces

A command-line feature uses a `cli` check. The argv runs in the check's `cwd`, else in `app.cwd`, else in the project root, each resolved against the project root (the folder that holds `.gifisi/`). Here `app.cwd` is `.`, so `bin/cli.mjs` is relative to the project root. Its `timeoutMs` defaults to 30000 and `exitCode` to 0:

```json
{
  "id": "cli-version",
  "description": "A user can print the installed version.",
  "surface": "cli",
  "checks": [
    { "name": "prints version", "run": ["node", "bin/cli.mjs", "--version"], "expect": { "exitCode": 0, "stdoutIncludes": "1." } }
  ]
}
```

A check can also pin stderr and run somewhere other than `app.cwd`. This one runs from `tools/` and expects a usage error:

```json
{ "name": "rejects an unknown flag", "cwd": "tools", "timeoutMs": 10000, "run": ["node", "migrate.mjs", "--nope"], "expect": { "exitCode": 2, "stderrIncludes": "unknown argument" } }
```

A write endpoint uses `request.body` and `request.headers`. An object `body` is sent as JSON with `content-type: application/json` unless the check sets its own; a string `body` is sent unchanged. `bodyExcludes` fails the check when the text appears, which catches a leaked field. Use a test token only, because the map is committed:

```json
{
  "name": "creates a cart with a coupon",
  "timeoutMs": 8000,
  "request": {
    "method": "POST",
    "path": "/api/carts",
    "headers": { "authorization": "Bearer test-token-from-seed" },
    "body": { "items": [10, 5], "coupon": "SAVE10" }
  },
  "expect": { "status": 201, "json": { "total": 13.5 }, "bodyExcludes": "internalCost" }
}
```

The full key set the script reads: `app` (`start`, `cwd`, `portEnv`, `readyPath`, `timeoutMs`); per feature `id`, `description`, `surface` (`http` or `cli`), `checks`; per check `name` and `timeoutMs`; for `http`, `request` (`method`, `path`, `headers`, `body`) and `expect` (`status`, `json`, `bodyIncludes`, `bodyExcludes`); for `cli`, `run`, `cwd`, and `expect` (`exitCode`, `stdoutIncludes`, `stderrIncludes`). The script ignores any other key.

A browser journey uses a `cli` check that runs the project's own browser test for that journey, for example `["node", "node_modules/@playwright/test/cli.js", "test", "e2e/checkout.spec.ts"]` with `"exitCode": 0`. Call the tool's JavaScript entry with `node`, not a package-manager shim: on Windows, `.cmd` shims do not start without a shell.

## Source

Adapted from pstack `skills/create-verification-skill/references/feature-map-example/README.md`, `create-note.md`, and `search.md` (Lauren Tan, cursor/plugins, MIT). The cart service and the JSON map format are gifisi-harness additions that mirror `scripts/run-autonomous-smoke-test.mjs`.
