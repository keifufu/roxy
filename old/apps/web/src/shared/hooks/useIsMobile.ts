import { createMediaQuery } from '@solid-primitives/media'

function useIsMobile() {
  const isMobile = createMediaQuery('(max-width: 768px)')
  return isMobile
}

export default useIsMobile