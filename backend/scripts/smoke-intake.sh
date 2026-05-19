#!/usr/bin/env bash
# Smoke test for the FB/IG intake endpoint. Assumes backend on :5000
# and that `node scripts/seed-intake.js` has been run.
set -u
BASE="http://localhost:5000"
SECRET="smokesecret-fb"
TOKEN="smoketoken-fb"

PHONE="+919999000001"
BODY='{"name":"Smoke Tester","phone":"'"$PHONE"'","email":"smoke@example.com","city":"Pune","notes":"from FB ad #1"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')

hr() { printf '\n— %s —\n' "$1"; }

hr "1. Wrong token → expect 404"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/intake/facebook/wrong-token" \
  -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=$SIG" --data "$BODY"

hr "2. Valid token, BAD signature → expect 401"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/intake/facebook/$TOKEN" \
  -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=deadbeef" --data "$BODY"

hr "3. Valid token + valid signature → expect 201 + new lead"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/api/intake/facebook/$TOKEN" \
  -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=$SIG" --data "$BODY"

hr "4. Same phone repeat → expect 201 with deduped:true"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/api/intake/facebook/$TOKEN" \
  -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=$SIG" --data "$BODY"

hr "5. Disabled (instagram) token → expect 404"
IG_BODY='{"name":"IG Test","phone":"+919999000099"}'
IG_SIG=$(printf '%s' "$IG_BODY" | openssl dgst -sha256 -hmac "smokesecret-ig" -hex | awk '{print $2}')
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/intake/instagram/smoketoken-ig" \
  -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=$IG_SIG" --data "$IG_BODY"
