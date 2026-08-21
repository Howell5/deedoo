/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry itself lives in the root entry's layout store (stores.ts);
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (sidebar toggle from ui-sidebar,
 * details open/close from ui-conversation) — writes stay inside the store's
 * declared action set, delivered as the registration's bound actions.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore } from './stores.ts'

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/** Selected feature-owned details surface, bound to one session key. */
export interface DetailsApplicationSelection {
  id: string
  scopeKey: string
}

/**
 * The outward layout face (`ctx.layout`): the panel transitions other
 * plugins may trigger — and exactly what a test fake must supply. The
 * attachPanels wiring hook stays on the concrete class (root-entry assembly
 * only).
 */
export interface ILayout {
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /** Open the details panel (no-op when already open). */
  openDetails(): void
  /** Close the details panel. */
  closeDetails(): void
  /**
   * Open a feature-owned details surface for one session key.
   * @param id - registered `details.application` id.
   * @param scopeKey - session identity the details surface belongs to.
   */
  openApplicationDetails(id: string, scopeKey: string): void
  /** Current feature-owned details selection, absent for ordinary tool details. */
  getDetailsApplication(): DetailsApplicationSelection | undefined
  /** Subscribe to feature-owned details selection changes. */
  subscribeDetailsApplication(listener: () => void): () => void
  /** Current first-class center application. */
  getApplication(): string
  /** Subscribe to center-application changes. */
  subscribeApplication(listener: () => void): () => void
  /** Select a registered center application by stable id. */
  selectApplication(id: string): void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  #panels: PanelActions | undefined
  #application = 'conversation'
  readonly #applicationListeners = new Set<() => void>()
  #detailsApplication: DetailsApplicationSelection | undefined
  readonly #detailsApplicationListeners = new Set<() => void>()

  /**
   * Adopt the root entry's bound store actions. Called from the root
   * registration's inject hook (a sanctioned assembly side effect), so the
   * face is live from the entry's first render; on entry re-register the
   * fresh actions overwrite the stale set.
   * @param actions - bound actions of the entry's layout store instance.
   */
  attachPanels(actions: PanelActions): void {
    this.#panels = actions
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.#require().toggleSidebar()
  }

  /** Open the details panel (no-op when already open). */
  openDetails(): void {
    this.#setDetailsApplication(undefined)
    this.#require().openDetails()
  }

  /** Close the details panel. */
  closeDetails(): void {
    this.#require().closeDetails()
    this.#setDetailsApplication(undefined)
  }

  /** Open a registered feature details surface for one session key. */
  openApplicationDetails(id: string, scopeKey: string): void {
    if (id.trim() === '' || scopeKey.trim() === '') {
      throw new Error('layout: details application id and scope key must be non-empty')
    }
    this.#setDetailsApplication({ id, scopeKey })
    this.#require().openDetails()
  }

  /** Current feature-owned details selection. */
  getDetailsApplication = (): DetailsApplicationSelection | undefined => this.#detailsApplication

  /** Subscribe to feature-owned details selection changes. */
  subscribeDetailsApplication = (listener: () => void): (() => void) => {
    this.#detailsApplicationListeners.add(listener)
    return () => { this.#detailsApplicationListeners.delete(listener) }
  }

  /** Current first-class center application. */
  getApplication = (): string => this.#application

  /** Subscribe to center-application changes. */
  subscribeApplication = (listener: () => void): (() => void) => {
    this.#applicationListeners.add(listener)
    return () => { this.#applicationListeners.delete(listener) }
  }

  /** Select a registered center application by stable id. */
  selectApplication(id: string): void {
    if (id.trim() === '') throw new Error('layout: application id must be non-empty')
    if (this.#application === id) return
    this.#application = id
    if (id !== 'conversation') this.closeDetails()
    for (const listener of [...this.#applicationListeners]) listener()
  }

  #setDetailsApplication(selection: DetailsApplicationSelection | undefined): void {
    if (
      this.#detailsApplication?.id === selection?.id
      && this.#detailsApplication?.scopeKey === selection?.scopeKey
    ) return
    this.#detailsApplication = selection
    for (const listener of [...this.#detailsApplicationListeners]) listener()
  }

  #require(): PanelActions {
    // Callers are UI gestures, which cannot fire before the root entry
    // rendered (the inject hook runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#panels === undefined) throw new Error('layout: panel actions not wired (root entry not mounted)')
    return this.#panels
  }
}
