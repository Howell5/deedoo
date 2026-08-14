# DeepSeek Harness Desktop

English | [中文](README.zh.md)

Electron shell for the shipped DeepSeek Harness Web client. The renderer runs
with Chromium sandboxing, no Node integration, context isolation, and denied
permission requests. The Harness profile runs in an Electron Utility Process
and listens on an operating-system-assigned loopback port.

## Development

From the repository root:

```sh
pnpm run dev:desktop
```

This builds the host libraries, browser bundles, and desktop entry before
opening Electron. The resulting application does not use a system Node.js
runtime; Electron supplies the runtime used by the Utility Process.

## Packaging

```sh
pnpm run package:desktop
```

The staging step uses `pnpm deploy` to materialize the desktop app and its
complete production dependency closure before Electron Builder creates the
platform artifact. App resources remain unpacked because Electron Utility
Process entry points must be physical files.

## Current boundary

The first desktop carrier reuses the proven HTTP/WebSocket Web profile on a
random loopback port. The process is isolated and the port is never exposed
outside loopback, but another local process can still probe it. Replacing this
carrier with the already-planned IPC transport is the production-hardening
follow-up; it does not require a product UI rewrite.

Electron blocks the Node internals flag in packaged applications, so live
profile-patch watching is disabled on this surface. Restart the desktop app
after editing a profile patch.
