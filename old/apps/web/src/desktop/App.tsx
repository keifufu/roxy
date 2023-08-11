import { useRoutes } from '@solidjs/router'
import { Show, type Component } from 'solid-js'
import Store from '../shared/state/store'
import { useTheme } from '../shared/state/theme'
import { Header } from './components/Header'
import ToastContainer from './components/Toasts'
import routes from './routes'

const DesktopApp: Component = () => {
  const Routes = useRoutes(routes)
  const { colorScheme, setColorScheme } = useTheme()

  return (<>
    <div class={'bg-bg text-text min-h-screen w-full overflow-hidden'}>
      <ToastContainer />
      <Show when={Store.user.isLoading()}>
        <div>Loading...</div>
      </Show>
      <Show when={!Store.user.isLoading()}>
        <Header />
        <Routes />
      </Show>
      <button onClick={() => {
        setColorScheme(colorScheme() === 'dark' ? 'light' : 'dark')
      }}>Toggle theme</button>
    </div>
  </>)
}

export default DesktopApp