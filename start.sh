#!/usr/bin/env bash
set -e

echo "Starting Tailscale..."
tailscaled --state=/tmp/tailscale.state --socket=/tmp/tailscale.sock &

# Give daemon a moment
sleep 2

echo "Bringing up Tailscale..."
tailscale --socket=/tmp/tailscale.sock up --authkey="${TAILSCALE_AUTHKEY}" --hostname="render-whatsapp-bot" --accept-dns=false

echo "Starting Node server..."
node server.js

