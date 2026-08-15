import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <main className="error-page">
      <img src="/deedoo-icon.png" alt="" />
      <span>404</span>
      <h1>Nothing is swimming here.</h1>
      <div>{children || <p>The page you requested does not exist.</p>}</div>
      <Link className="button button-primary" to="/">
        Back to Deedoo
      </Link>
    </main>
  )
}
