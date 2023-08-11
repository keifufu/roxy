import { useNavigate } from '@solidjs/router'
import { type Component } from 'solid-js'
import Store from '../../shared/state/store'

const SignUpPage: Component = () => {
  const navigate = useNavigate()

  return (
    <div>
      <input placeholder='Username' />
      <input placeholder='Password' type='password' />
      <button onClick={() => {
        Store.user.signUp('keifufu', 'password123')
      }}>Register</button>
      <button onClick={() => navigate('/login')}>Go to login page</button>
    </div>
  )
}

export default SignUpPage