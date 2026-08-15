import { Link } from '@tanstack/react-router'

export function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  return (
    <header className={`site-header${inverse ? ' site-header-inverse' : ''}`}>
      <Link className="brand" to="/" aria-label="Deedoo home">
        <img src="/deedoo-icon.png" alt="" />
        <span>deedoo</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link to="/plugins" activeProps={{ 'aria-current': 'page' }}>
          Plugins
        </Link>
        <a href="https://github.com/Howell5/deedoo">GitHub</a>
        <a
          className="header-download"
          href="https://github.com/Howell5/deedoo/releases"
        >
          Get the app <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  )
}
