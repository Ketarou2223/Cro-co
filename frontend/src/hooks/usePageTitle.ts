import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Cro-co` : 'Cro-co'
    return () => { document.title = 'Cro-co' }
  }, [title])
}
