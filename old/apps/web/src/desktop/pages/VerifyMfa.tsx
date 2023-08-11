import { createSignal, type Component } from 'solid-js'
import Store from '../../shared/state/store'

const VerifyMfa: Component = () => {
  const [input, setInput] = createSignal('')

  return (
    <div>
      <div>Enter your mfa token or backup code here pls</div>
      <input value={input()} onChange={(e) => setInput(e.currentTarget.value)} placeholder='enter code' />
      <button onClick={() => Store.user.authenticateWithMfa(input())}>Submit</button>
    </div>
  )
}

export default VerifyMfa