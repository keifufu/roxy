import { Show, lazy, type Component } from 'solid-js'
import useIsMobile from './shared/hooks/useIsMobile'

const DesktopApp = lazy(() => import('./desktop/App'))
const MobileApp = lazy(() => import('./mobile/App'))

const App: Component = () => {
  const isMobile = useIsMobile()

  return (<>
    <Show when={isMobile()}>
      <MobileApp />
    </Show>
    <Show when={!isMobile()}>
      <DesktopApp />
    </Show>
  </>)
}

export default App