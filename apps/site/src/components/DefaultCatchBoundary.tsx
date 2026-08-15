import {
  Link,
  useLocation,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useLocation({
    select: location => location.pathname === '/',
  })

  console.error('Deedoo site error:', error)

  return (
    <main className="error-page">
      <img src="/deedoo-icon.png" alt="" />
      <span>Something drifted</span>
      <h1>That page could not be loaded.</h1>
      <p>Try the request again, or return to the Deedoo home page.</p>
      <div className="error-actions">
        <button
          className="button button-primary"
          onClick={() => {
            void router.invalidate()
          }}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className="button button-secondary"
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            className="button button-secondary"
            onClick={(e) => {
              e.preventDefault()
              window.history.back()
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </main>
  )
}
