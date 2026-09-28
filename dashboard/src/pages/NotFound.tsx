import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-dim text-sm mt-2">
        That section does not exist, or your role cannot open it.
      </p>
      <Link to="/" className="inline-block mt-5 btn-primary px-4 py-2 text-sm">
        Back to Command Center
      </Link>
    </div>
  )
}
