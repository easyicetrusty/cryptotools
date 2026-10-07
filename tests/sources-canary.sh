#!/bin/sh
# Synthetic test-only known-exact canary. Vetted scanner reads its fixture file, never the agent.
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"
node tests/prepare-scan.mjs
mkdir -p byo-scan
cp -r dist public byo-scan/
cp evidence-byo/*.json evidence-byo/app-runtime.log byo-scan/
cp byo-test-data/app.sqlite byo-scan/snapshot.sqlite
# Copy a WAL if present: scan both the primary DB and pending frames.
if [ -f byo-test-data/app.sqlite-wal ]; then cp byo-test-data/app.sqlite-wal byo-scan/snapshot.sqlite-wal; fi
node -e "import {writeFileSync} from 'node:fs';writeFileSync('byo-scan/leak-control.txt',['sk','step3','synthetic','notlive','0123456789'].join('-'));console.log('Synthetic positive control created; value withheld')"
(cd byo-scan && git init -q && git add -f .)
set +e
HOME="$PWD/test-scan-home" python3 test-tools/secret-scan.py --all "$PWD/byo-scan"
status=$?
set -e
if [ "$status" -ne 2 ]; then echo 'FAIL scanner positive control'; exit 1; fi
echo 'PASS known-exact positive control blocked with exit 2'
rm byo-scan/leak-control.txt
(cd byo-scan && git add -A)
HOME="$PWD/test-scan-home" python3 test-tools/secret-scan.py --all "$PWD/byo-scan"
echo 'PASS exact-byte canary absent from API captures, runtime log, SQLite+WAL, backend build and browser bundle'
