import { useNavigate } from '@solidjs/router'
import { type Component } from 'solid-js'
import Store from '../../shared/state/store'

const LoginPage: Component = () => {
  const navigate = useNavigate()

  return (
    <div>
      <input placeholder='Username or Email' />
      <input placeholder='Password' type='password' />
      <button onClick={() => {
        Store.user.login('keifufu', 'password123')
      }}>Login</button>
      <button onClick={() => navigate('/register')}>Go to register page</button>
    </div>
  )
}

export default LoginPage