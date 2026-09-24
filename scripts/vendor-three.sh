#!/usr/bin/env bash
# Пересобирает vendor/three.js (three + RoomEnvironment одним ES-модулем).
set -euo pipefail
VER="${1:-0.186.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
cd "$TMP"
npm pack "three@$VER" --silent >/dev/null
tar -xzf "three-$VER.tgz"
mkdir -p node_modules && ln -s ../package node_modules/three
printf "export * from 'three';\nexport { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';\n" > entry.js
npx -y esbuild@0.24.2 entry.js --bundle --format=esm --minify --outfile="$ROOT/vendor/three.js"
cp package/LICENSE "$ROOT/vendor/LICENSE-three.txt"
rm -rf "$TMP"
echo "vendor/three.js обновлён до three@$VER"
