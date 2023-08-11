import { For, type Component } from 'solid-js'
import Store from '../../shared/state/store'
import { type TToast } from '../../shared/state/toast'

type ToastProps = Component<{ toast: TToast }>

const ToastComponent: ToastProps = (props) => (
  <div onMouseEnter={() => Store.toast.hold(props.toast.id)} onMouseLeave={() => Store.toast.release(props.toast.id)} class='mb-4 flex w-full max-w-xs items-center rounded-lg bg-white p-4 text-gray-500 shadow dark:bg-gray-800 dark:text-gray-400' >
    <div class='ml-3 text-sm font-normal'>{props.toast.message}</div>
    <button type='button' class='-m-1.5 ml-auto inline-flex h-8 w-8 rounded-lg bg-white p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-white' aria-label='Close'>
      <span class='sr-only'>Close</span>
    </button>
  </div>
)

const ToastContainer: Component = () => (
  <div class='fixed left-[50%] top-0 transition-all duration-500'>
    <For each={Store.toast.get()}>
      {(toast) => (
        <ToastComponent toast={toast} />
      )}
    </For>
  </div>
)

export default ToastContainer