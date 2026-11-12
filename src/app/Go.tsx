import { Link, NavLink, useNavigate, type LinkProps, type NavLinkProps, type NavigateOptions, type To } from 'react-router-dom'

// Every move inside the app replaces the current history entry, so the app holds one entry in the
// browser's history. After the quick exit, Back leads to the page before the app, never into it (v1 spec 5.3).

export function Go(props: LinkProps) {
  return <Link {...props} replace />
}

export function GoNav(props: NavLinkProps) {
  return <NavLink {...props} replace />
}

export function useGo(): (to: To, options?: NavigateOptions) => void {
  const navigate = useNavigate()
  return (to, options) => navigate(to, { ...options, replace: true })
}
