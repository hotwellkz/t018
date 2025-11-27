import { useState } from 'react'
import { signIn } from '../lib/firebase'
import { useToast } from '../hooks/useToast'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast.success('Успешный вход!')
    } catch (error: any) {
      console.error('Ошибка входа:', error)
      const errorMessage =
        error.code === 'auth/user-not-found'
          ? 'Пользователь не найден'
          : error.code === 'auth/wrong-password'
          ? 'Неверный пароль'
          : error.code === 'auth/invalid-email'
          ? 'Неверный email'
          : error.message || 'Ошибка входа'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>WhiteCoding Studio</h1>
        <p className="login-subtitle">Войдите в свой аккаунт</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="your@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

