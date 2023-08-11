import { Navigate, useLocation, useNavigate, type RouteDefinition } from '@solidjs/router'
import { createEffect, lazy, type Component } from 'solid-js'
import Store from '../shared/state/store'

type TLazy = Component & { preload: () => Promise<{ default: Component }> }
const makeAuthGuard = (Route: TLazy, requireLogin = true) => {
  const AuthGuard: Component = () => {
    const navigate = useNavigate()
    const location = useLocation()

    createEffect(() => {
      // Force user to /verify-mfa if logged in and session isn't mfa authenticated
      if (location.pathname !== '/verify-mfa' && Store.user.isLoggedIn() && Store.user.getUser().hasMfaEnabled && !Store.user.getSession().isMfaAuthenticated)
        return navigate('/verify-mfa', { replace: true })

      // Force user away from /verify-mfa their session is already authenticated
      if (location.pathname === '/verify-mfa' && Store.user.isLoggedIn() && (!Store.user.getUser().hasMfaEnabled || Store.user.getSession().isMfaAuthenticated))
        return navigate('/', { replace: true })

      if ((requireLogin && !Store.user.isLoggedIn()) || (!requireLogin && Store.user.isLoggedIn()))
        navigate(requireLogin ? '/login' : '/', { replace: true })
    })

    return <Route />
  }

  return AuthGuard
}

const routes: RouteDefinition[] = [
  {
    path: '/',
    component: makeAuthGuard(lazy(() => import('./pages/Home')))
  },
  {
    path: '/login',
    component: makeAuthGuard(lazy(() => import('./pages/Login')), false)
  },
  {
    path: '/signup',
    component: makeAuthGuard(lazy(() => import('./pages/SignUp')), false)
  },
  {
    path: '/verify-mfa',
    component: makeAuthGuard(lazy(() => import('./pages/VerifyMfa')))
  },
  {
    path: '*',
    component: () => <Navigate href='/' />
  }
]

export default routes