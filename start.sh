#!/usr/bin/env bash
set -e

TS_DIR="./.bin"

echo "Starting Tailscale..."
"$TS_DIR/tailscaled" --state=/tmp/tailscale.state --socket=/tmp/tailscale.sock &

sleep 2

echo "Bringing up Tailscale..."
"$TS_DIR/tailscale" --socket=/tmp/tailscale.sock up \
  --authkey="${TAILSCALE_AUTHKEY}" \
  --hostname="render-whatsapp-bot" \
  --accept-dns=false

echo "Starting Node server..."
node server.js

