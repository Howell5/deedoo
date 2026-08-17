# @deepseek-ai/dsh-client-ui-update

Settings-footer update indicator for the Deedoo desktop shell.

## Purpose

Renders an update hint in the bottom-right of the settings panel when the
packaged app version is behind the newest Deedoo GitHub release. Checking and
up-to-date states render nothing (zero-noise); an available update renders a
link that opens the release page in the system browser.

## Behavior

- Detection source: `https://api.github.com/repos/Howell5/deedoo/releases?per_page=1`
  (CORS-enabled; newest release first, prereleases included).
- Current version: the `settings.footer` owner prop `currentVersion`, injected
  by the settings shell from `<meta name="dsh-version">` on the desktop
  startup page. Web-only mode has no meta tag and falls back to `0.0.0`, under
  which any published release reads as an update.
- Comparison: npm `semver` strict greater-than, rc-aware.

## Model experience

- No tokens, KV cache, or provider requests. One unauthenticated GitHub API
  call per settings-panel open (rate limit 60/h is far above use).
- Fetch failure is silent: the indicator renders nothing rather than an error.

## Known Limitations and Deferred Work

- Product copy is inline Chinese; locale extraction is deferred.
- Web-only mode cannot know the packaged version (no meta tag); acceptable for
  the pre-release stage where every release is an update.
