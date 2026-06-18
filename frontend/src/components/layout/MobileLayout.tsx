import { Outlet } from 'react-router-dom'

/**
 * Mobile shell: a centered phone-width column. Each page renders its own
 * header (the blue bars from the mockups), so the shell stays minimal.
 */
export function MobileLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen max-w-md bg-slate-50">
        <Outlet />
      </div>
    </div>
  )
}
