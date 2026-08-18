# Agent Note: Ad-hoc sign macOS release artifacts

Status: implemented

English | [中文](2026-08-18-adhoc-sign-macos-release-artifacts.zh.md)

## Problem

The first Deedoo desktop release (v0.1.0-rc.7, built by `deedoo-release.yml`)
could not be opened: macOS reported "DeepSeek Harness is damaged and can't be
opened. You should move it to the Trash." The zero-cost distribution decision
skipped code signing by setting `CSC_IDENTITY_AUTO_DISCOVERY=false`, which makes
electron-builder 26 return a null identity and skip signing entirely. Electron
43 binaries carry their own linker-generated ad-hoc signatures that require
sealed bundle resources; without a bundle-level `codesign` pass there is no
`_CodeSignature/CodeResources`, so `codesign --verify` fails with "code has no
resources but signature indicates they must be present". Gatekeeper classifies
that invalid half-signed state as damaged — not merely unidentified — and
offers no click-through.

## Decision

`apps/desktop/package.json` sets `build.mac.identity: "-"` so electron-builder
ad-hoc signs the whole bundle (all nested helpers and frameworks) and emits
`_CodeSignature/CodeResources`, and `build.mac.hardenedRuntime: false` because
ad-hoc signing with hardened runtime requires the
`com.apple.security.cs.disable-library-validation` entitlement or the app fails
library validation at launch. `deedoo-release.yml` keeps
`CSC_IDENTITY_AUTO_DISCOVERY=false` so a stray local keychain identity cannot
hijack the zero-cost decision; an explicit `identity` bypasses auto-discovery
anyway. The result is a valid ad-hoc signature: `codesign --verify` passes,
Gatekeeper shows the standard "unidentified developer" right-click path, and
`spctl` reports `rejected` instead of damaged. Verified by re-signing the
broken rc.7 bundle with `codesign --force --deep --sign -` and confirming both
`codesign --verify --deep --strict` and the changed `spctl` outcome.

## Alternatives considered

**afterPack / afterSign hook that ad-hoc signs.** electron-builder skips the
`afterSign` hook entirely when no signing occurred ("skipping afterSign hook as
no signing occurred, perhaps you intended afterPack"), and an `afterPack` hook
re-implements what the config-level identity already does. The config option is
first-party, one line, and survives the staged `dist/app` package.json copy.

**Strip the linker signatures (`codesign --remove-signature`).** Produces a
truly unsigned app, but requires walking every Mach-O in the bundle, and the
ad-hoc signed click-through state is the documented zero-cost flow.

**Buy a Developer ID certificate.** Rejected by the zero-cost distribution
decision; `identity: "-"` drops out cleanly when a real certificate arrives.

## Consequences

DMG and ZIP artifacts ship with valid ad-hoc signatures and Gatekeeper click-
through instead of a hard "damaged" rejection. `hardenedRuntime` stays off, so
the app gains no runtime hardening until a paid certificate funds it. The
broken v0.1.0-rc.7 release and tag must be deleted so the next pipeline run can
re-publish the same version with fixed artifacts.
