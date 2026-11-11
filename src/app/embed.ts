import { useSearchParams } from 'react-router-dom'

/** Panes inside the pitch stage carry `?embed=1`; links must keep it. */
export function useEmbedTo(): (path: string) => string {
  const [params] = useSearchParams()
  const embedded = params.get('embed') === '1'
  return (path) => (embedded ? `${path}${path.includes('?') ? '&' : '?'}embed=1` : path)
}
