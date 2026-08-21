# @deepseek-ai/dsh-widgets-local

English | [中文](README.zh.md)

Local Service Provider for [`@deepseek-ai/dsh-widgets`](../widgets/README.md). It stores managed projects under `$DSH_HOME/widgets/projects` by default, revalidates the manifest and entry on every read, and seeds an offline calculator plus a networked Gold / USD trend Widget unless `seedExamples` is disabled.

`root` overrides the managed-project directory. `seedExamples` defaults to `true`; seeding never replaces an existing directory with the same id. `watch` defaults to `true`, and `watchDebounceMs` defaults to 120 milliseconds. The watcher ignores initial discovery, emits `widgets/changed` for the direct managed project containing a later filesystem change, and closes with the provider fiber. Built-in examples cannot be removed through the Widget lifecycle API.

`create()` writes a uniquely identified square starter with `widget.json`, a self-contained `dist/index.html`, and project-local `AGENTS.md` authoring rules, then publishes it through an atomic rename. The project needs no build command or development server and is ready to become an ordinary Agent Workspace.

Installation accepts an absolute source directory containing `widget.json` and its declared entry. It copies only the normalized manifest and the entry HTML into a private staging directory, then atomically renames that directory into place. The manifest is limited to 64 KiB and the HTML entry to 512 KiB. Entry traversal, escaping symlinks, non-files, duplicate ids, and malformed manifests fail before publication.

Widget network requests are credential-free HTTPS GETs. Every destination and redirect must match an exact hostname in the manifest, resolve only to public addresses, use the default port, complete within 15 seconds, stay within three redirects, and return at most 512 KiB. The provider returns text to the frame bridge and never exposes Host credentials.

The calculator declares a square canvas. The Gold / USD example declares a `16:9` canvas, allows only `xaus.com`, requests its public daily history endpoint, and renders the latest 90 observations. Both entries keep their complete layout inside the declared canvas; the gold display is indicative rather than a trading quote.

The starter's `AGENTS.md` makes visual design part of every ordinary Workspace Agent creation and redesign, including incremental changes. It requires the Agent to infer the audience, use moment, primary signal, and emotional tone; commit to one domain-specific visual system; implement relevant data states and accessibility behavior; and self-review the result against explicit anti-template rules. Existing Workspace instruction loading supplies that file to model requests without asking the user to configure a style; the browser container enforces the fixed canvas independently.

## Model Experience

Indirectly, through the starter `AGENTS.md` consumed by the Workspace instruction loader: after a created project becomes a Workspace, the loader records the file as model-visible context for initial creation and later edits; the instructions add no tools or schemas.

#### KV Cache effect

The recorded instruction payload remains in the Session prefix. Editing `AGENTS.md` changes subsequent model context from the update point; Widget data requests remain independent Host HTTP requests and never enter a model request.

## Known Limitations and Deferred Work

- **Static assets are single-file** — installation copies only `widget.json` and the declared HTML entry, so scripts, styles, fonts, and images must be embedded into that document.
- **Updates require a new id or manual removal** — installing an existing id fails, and built-in examples are intentionally immutable.
- **Refresh declarations are metadata** — this provider does not schedule visible intervals or retain a last-known-good network response.
