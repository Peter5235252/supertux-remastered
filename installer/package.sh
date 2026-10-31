#!/bin/sh
# Build the installer and publish the binary + checksum into the website.
set -eu

cd "$(dirname "$0")"
cargo build --release

OUT="../website/public/downloads"
BIN="supertux-remastered-setup-linux-x86_64"

mkdir -p "$OUT"
cp "target/release/supertux-remastered-setup" "$OUT/$BIN"
chmod 755 "$OUT/$BIN"

cd "$OUT"
sha256sum "$BIN" > SHA256SUMS
cat SHA256SUMS
