# Agent Note: Electron desktop bootstrap — sandboxed renderer, Utility Process backend, and deployable runtime closure

Status: implemented

English | [中文](2026-08-14-electron-desktop-bootstrap.zh.md)

## Problem

DeepSeek Harness has a complete browser product, but using it currently assumes
that a user can install and operate a Node.js command-line tool. A desktop
distribution must run on a machine without Node.js, preserve the existing
plugin-authored UI and protocol behavior, isolate backend failures from the
window process, and produce a dependency-complete platform artifact.

The protocol architecture reserved an Electron IPC carrier, but no IPC client,
stream bridge, plugin-bundle transport, or desktop composition exists yet.
Implementing those four boundaries together would delay the first usable
desktop application and duplicate already-tested Web startup behavior.

## Decision

**Ship the first desktop bootstrap as an Electron application under
`apps/desktop`.** Electron supplies the Node.js runtime, so neither development
artifacts nor packaged applications invoke a system Node binary. The shell
starts the built `@deepseek-ai/dsh` CLI with `web --port 0` in an Electron
Utility Process and treats the existing `dsh web:` URL line as the readiness
signal. The browser window then loads the unchanged shipped Web client.

**Keep the renderer unprivileged.** The BrowserWindow enables Chromium
sandboxing and context isolation, disables Node integration, retains Web
security, denies permission requests, blocks child windows, and opens only
validated HTTP(S) external links through the operating system. Harness
navigation is restricted to the assigned loopback origin.

**Make process ownership explicit.** One application instance owns one Utility
Process. Startup has a bounded readiness timeout and a native retry/quit
failure surface. Unexpected backend exit returns the window to the startup
surface. Restart first awaits backend shutdown; application quit sends the
ordinary SIGTERM path and waits for bounded cleanup before exiting.
Packaged Electron applications strip the Node internals flag Cordis HMR
requires, so the desktop invocation disables profile-patch watchers; profile
edits apply after restart.

**Package a materialized production closure.** `pnpm deploy --prod` stages the
desktop package and every workspace runtime dependency before Electron Builder
creates DMG/ZIP, NSIS, or AppImage artifacts. App resources remain unpacked:
Utility Process requires a physical entrypoint, and the bootstrap forks the
CLI entry directly. Platform signing is therefore part of the release boundary
rather than ASAR being treated as an integrity mechanism.

This decision partially supersedes the Electron-carrier portion of
[GUI layering and the RPC protocol](2026-07-19-gui-layering-and-rpc-protocol.md):
the IPC carrier remains the production-hardening target, but it is no longer a
prerequisite for the first desktop executable. The bootstrap temporarily
reuses `dsh-host-webserver` on an operating-system-assigned loopback port.

## Alternatives considered

**Implement IPC before creating the shell.** Rejected for the bootstrap because
the current client loads plugin bundles dynamically and owns two streaming
channels in addition to unary fetch. All three transports and their teardown
semantics would need to land together before any UI could render.

**Run the Harness tree in Electron Main.** Rejected because model execution,
plugin failures, native modules, and long-lived streams would share the native
window's failure domain.

**Spawn an external `node` or `dsh` executable.** Rejected because it recreates
the installation requirement the desktop product is meant to remove and makes
runtime version drift a user problem.

**Rewrite the UI as a desktop-specific frontend.** Rejected because the
existing Web client is already the product surface and its composition is
plugin-authored. A second UI would split behavior and verification.

## Consequences

Users can launch a native window without installing Node.js, while the existing
onboarding, settings, workspaces, sessions, plugins, unary RPC, and WebSocket
streams remain unchanged. Backend crashes are recoverable without losing the
native shell, and packaging has an explicit standalone dependency boundary.

The accepted bootstrap risk is local reachability: although the server binds
only to `127.0.0.1` on a random port and the port is not advertised outside
the parent process, another process running as the same user can probe local
ports. IPC removes that exposure and remains required before treating the
carrier as fully hardened. Platform signing, notarization, automatic updates,
and an OS-keychain credential provider are separate release work; the
bootstrap does not claim them.
