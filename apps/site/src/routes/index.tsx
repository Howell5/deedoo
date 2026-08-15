import { createFileRoute } from '@tanstack/react-router'
import { Blocks, Code2, Laptop, PackageOpen } from 'lucide-react'
import { PluginCard } from '~/components/PluginCard'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { plugins } from '~/data/plugins'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="home">
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            Desktop for DeepSeek Harness
          </p>
          <h1>
            Deep work,
            <br />
            <em>beautifully local.</em>
          </h1>
          <p className="hero-lede">
            Deedoo brings DeepSeek Harness into a focused desktop workspace—
            your sessions, tools, and community plugins in one calm place.
          </p>
          <div className="hero-actions">
            <a
              className="button button-primary"
              href="https://github.com/Howell5/deedoo/releases"
            >
              Download Deedoo <span aria-hidden="true">↓</span>
            </a>
            <a className="button button-secondary" href="/plugins">
              Explore plugins <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="availability">
            Desktop builds are being prepared for macOS, Windows, and Linux.
          </p>
        </div>

        <div className="product-stage" aria-label="Deedoo desktop preview">
          <div className="stage-orbit stage-orbit-one" />
          <div className="stage-orbit stage-orbit-two" />
          <div className="app-window">
            <div className="window-bar">
              <div className="traffic-lights" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="window-title">Deedoo</div>
              <div className="window-status">
                <span />
                Local
              </div>
            </div>
            <div className="app-body">
              <aside>
                <div className="aside-brand">
                  <img src="/deedoo-icon.png" alt="" />
                  <strong>Workspace</strong>
                </div>
                <button type="button">＋ New session</button>
                <p>Today</p>
                <ul>
                  <li className="active">
                    <span>Build the plugin hub</span>
                    <small>Now</small>
                  </li>
                  <li>
                    <span>Desktop packaging</span>
                    <small>18m</small>
                  </li>
                  <li>
                    <span>Review extension API</span>
                    <small>1h</small>
                  </li>
                </ul>
              </aside>
              <section className="conversation">
                <div className="conversation-top">
                  <div>
                    <small>DEEDOO / WEBSITE</small>
                    <strong>Build the plugin hub</strong>
                  </div>
                  <span className="model-pill">DeepSeek</span>
                </div>
                <div className="message user-message">
                  Build an open place to discover every useful Harness plugin.
                </div>
                <div className="message assistant-message">
                  <div className="thinking-row">
                    <span className="thinking-dot" />
                    Deep diving
                  </div>
                  <p>
                    I’ll start with a fast, searchable directory and keep the
                    data open for the community.
                  </p>
                  <div className="task-card">
                    <span className="task-check">✓</span>
                    <div>
                      <strong>Marketplace foundation</strong>
                      <small>TanStack Start · Cloudflare</small>
                    </div>
                    <span className="task-state">Building</span>
                  </div>
                </div>
                <div className="composer">
                  <span>Ask Deedoo anything…</span>
                  <button type="button" aria-label="Send message">
                    ↑
                  </button>
                </div>
              </section>
            </div>
          </div>
          <div className="floating-note">
            <span>✦</span>
            <div>
              <small>COMMUNITY</small>
              <strong>Plugins are taking off</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-principles" aria-label="Why Deedoo">
        <div className="principle-intro">
          <span>01 / WHY DEEDOO</span>
          <h2>
            The Harness is powerful.
            <br />
            Your desktop should feel <em>effortless.</em>
          </h2>
        </div>
        <div className="principle-list">
          <article>
            <Laptop aria-hidden="true" size={22} />
            <span>01</span>
            <h3>A native home</h3>
            <p>
              Launch the complete Harness web experience in an isolated desktop
              shell without managing a browser tab or local server.
            </p>
          </article>
          <article>
            <Blocks aria-hidden="true" size={22} />
            <span>02</span>
            <h3>Built on plugins</h3>
            <p>
              Models, tools, sandboxes, sessions, and interface extensions stay
              composable through the architecture Harness already owns.
            </p>
          </article>
          <article>
            <PackageOpen aria-hidden="true" size={22} />
            <span>03</span>
            <h3>Open by default</h3>
            <p>
              Deedoo and its community directory are developed in public, with
              GitHub as the source for code, feedback, and plugin discovery.
            </p>
          </article>
        </div>
      </section>

      <section className="home-plugins">
        <div className="section-heading">
          <div>
            <span>02 / COMMUNITY</span>
            <h2>Make Harness yours.</h2>
          </div>
          <p>
            The ecosystem is moving fast. We collect the most useful public
            projects into one open, searchable directory.
          </p>
          <a href="/plugins">
            Browse all plugins <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="plugin-grid home-plugin-grid">
          {[...plugins]
            .filter(plugin => plugin.featured)
            .sort((left, right) => right.stars - left.stars)
            .slice(0, 3)
            .map(plugin => (
              <PluginCard
                plugin={plugin}
                key={`${plugin.owner}/${plugin.repo}`}
              />
            ))}
        </div>
      </section>

      <section className="download-section" id="download">
        <div className="download-copy">
          <span>03 / DOWNLOAD</span>
          <h2>
            Your Harness.
            <br />
            One click away.
          </h2>
          <p>
            Deedoo packages the Harness desktop shell and its runtime together.
            The first signed builds are being prepared in public.
          </p>
          <a
            className="button download-github"
            href="https://github.com/Howell5/deedoo"
          >
            <Code2 aria-hidden="true" size={18} />
            Follow development
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="platform-list">
          {[
            ['macOS', 'Apple silicon and Intel'],
            ['Windows', 'Windows 10 and later'],
            ['Linux', 'AppImage distribution'],
          ].map(([platform, support], index) => (
            <a
              href="https://github.com/Howell5/deedoo/releases"
              key={platform}
            >
              <span>0{index + 1}</span>
              <div>
                <strong>{platform}</strong>
                <small>{support}</small>
              </div>
              <em>Coming soon</em>
              <b aria-hidden="true">↗</b>
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
