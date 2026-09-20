import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate session on mount
  useEffect(() => {
    const token = localStorage.getItem('dm_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.auth.me()
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('dm_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.auth.login({ email, password })
    localStorage.setItem('dm_token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await api.auth.register({ name, email, password })
    localStorage.setItem('dm_token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {})
    localStorage.removeItem('dm_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
