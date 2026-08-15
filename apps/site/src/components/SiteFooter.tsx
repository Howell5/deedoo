import { Link } from '@tanstack/react-router'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/deedoo-icon.png" alt="" />
        <div>
          <strong>deedoo</strong>
          <span>A community desktop for DeepSeek Harness.</span>
        </div>
      </div>
      <div className="footer-links">
        <Link to="/plugins">Plugins</Link>
        <a href="https://github.com/Howell5/deedoo">Source</a>
        <a href="https://github.com/Howell5/deedoo/issues">Feedback</a>
      </div>
      <p>
        Deedoo is an independent community project. DeepSeek and DeepSeek
        Harness are trademarks of their respective owners.
      </p>
    </footer>
  )
}
