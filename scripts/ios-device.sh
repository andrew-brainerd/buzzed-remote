#!/usr/bin/env bash
# Build a debug iOS app and install + launch it on a connected iPhone via `devicectl`.
# Works around Tauri's broken `ios-deploy` path on iOS 26 (see docs/specs/buzzed-remote.md, WRM-D):
# Tauri drives the Rust compile (Xcode Run can't find cargo), then Apple's devicectl does the install.
set -euo pipefail

TEAM="${APPLE_DEVELOPMENT_TEAM:-V6J999TY63}"
BUNDLE_ID="dev.brainerd.buzzedremote"
BUILD_DIR="src-tauri/gen/apple/build/arm64"

echo "▶ Building debug iOS app (team ${TEAM})…"
APPLE_DEVELOPMENT_TEAM="${TEAM}" pnpm tauri ios build --debug

IPA=$(ls -t "${BUILD_DIR}"/*.ipa 2>/dev/null | head -1 || true)
[ -n "${IPA}" ] || { echo "✖ No .ipa found in ${BUILD_DIR}"; exit 1; }
echo "▶ Built ${IPA}"

DEVICE_ID=$(xcrun devicectl list devices 2>/dev/null \
  | grep -i connected | grep -iv unavailable \
  | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}' | head -1 || true)
[ -n "${DEVICE_ID}" ] || { echo "✖ No connected iPhone (unlock it, enable Developer Mode, Trust the Mac)."; exit 1; }

echo "▶ Installing to device ${DEVICE_ID}…"
xcrun devicectl device install app --device "${DEVICE_ID}" "${IPA}"

echo "▶ Launching…"
xcrun devicectl device process launch --device "${DEVICE_ID}" "${BUNDLE_ID}" >/dev/null 2>&1 || true
echo "✅ Installed and launched Buzzed Remote on device ${DEVICE_ID}."
