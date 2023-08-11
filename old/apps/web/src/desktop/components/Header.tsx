import { Link } from '@solidjs/router'
import { For, Show, type Component } from 'solid-js'
import Store from '../../shared/state/store'

const links = [
  {
    name: 'Files',
    path: '/files'
  },
  {
    name: 'Url Shortener',
    path: '/urls'
  }
]

export const Header: Component = () => (
  <div class='bg-card flex p-3'>
    <img></img>
    <div>{import.meta.env.VITE_NAME}</div>
    <For each={links}>
      {(item) => (
        <Link href={item.path}>
          {item.name}
        </Link>
      )}
    </For>
    <div class='ml-auto'>
      <Show when={Store.user.isLoggedIn()}>
        // TODO
      </Show>
      <Show when={!Store.user.isLoggedIn()}>
        <Link href='/login'>Login</Link>
        <Link href='/signup'>Sign Up</Link>
      </Show>
    </div>
  </div>
)