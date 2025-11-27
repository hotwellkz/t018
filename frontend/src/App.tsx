import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import './App.css'
import VideoGeneration from './components/VideoGeneration'
import ChannelSettings from './components/ChannelSettings'
import VideoJobsHistory from './pages/VideoJobsHistory'
import AutomationDebug from './pages/AutomationDebug'
import ToastContainer from './components/ToastContainer'
import Login from './components/Login'
import { useToast } from './hooks/useToast'
import { useWizard } from './contexts/WizardContext'
import { useAuth } from './contexts/AuthContext'
import { signOutUser } from './lib/firebase'
import WizardSteps from './components/WizardSteps'
import WizardStepsSticky from './components/WizardStepsSticky'

function App() {
  const location = useLocation()
  const toast = useToast()
  const { user, loading } = useAuth()
  const { step, setStep, selectedChannel, setSelectedChannel } = useWizard()
  const [isStickyVisible, setIsStickyVisible] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    try {
      await signOutUser()
      toast.success('Вы вышли из аккаунта')
    } catch (error: any) {
      toast.error('Ошибка при выходе: ' + (error.message || 'Неизвестная ошибка'))
    }
  }

  const isActive = (path: string) => location.pathname === path
  const isVideoGenerationPage = location.pathname === '/'

  // Отслеживание скролла для показа липкого stepper на мобильных
  useEffect(() => {
    if (!isVideoGenerationPage || window.innerWidth > 768) {
      setIsStickyVisible(false)
      return
    }

    const handleScroll = () => {
      if (!headerRef.current || !mainContentRef.current) return
      
      const headerBottom = headerRef.current.offsetHeight
      const scrollY = window.scrollY
      
      // Показываем липкий stepper когда шапка ушла за пределы экрана
      setIsStickyVisible(scrollY > headerBottom)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Проверяем сразу
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isVideoGenerationPage])

  const handleStepClick = (newStep: 1 | 2 | 3) => {
    setStep(newStep)
    // При возврате на шаг 1 сбрасываем канал
    if (newStep === 1) {
      setSelectedChannel(null)
    }
  }

  // Показываем форму входа, если пользователь не авторизован
  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <Login />
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      </div>
    )
  }

  return (
    <div className="app">
      <header ref={headerRef} className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>shortai.ru</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>{user.email}</span>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Выйти
            </button>
          </div>
        </div>
        <nav className="tabs">
          <Link
            to="/"
            className={isActive('/') ? 'active' : ''}
            aria-label="Переключить на вкладку генерации видео"
          >
            Генерация видео
          </Link>
          <Link
            to="/jobs"
            className={isActive('/jobs') ? 'active' : ''}
            aria-label="Перейти к истории генераций"
          >
            📋 История видео
          </Link>
          <Link
            to="/settings"
            className={isActive('/settings') ? 'active' : ''}
            aria-label="Переключить на вкладку настроек каналов"
          >
            Настройки каналов
          </Link>
          <Link
            to="/automation-debug"
            className={isActive('/automation-debug') ? 'active' : ''}
            aria-label="Перейти к диагностике автоматизации"
          >
            Диагностика автоматизации
          </Link>
        </nav>
        {isVideoGenerationPage && (
          <WizardSteps
            currentStep={step}
            onStepClick={handleStepClick}
            selectedChannel={selectedChannel}
            isCondensed={false}
          />
        )}
      </header>
      {/* Липкий stepper для мобильных */}
      {isVideoGenerationPage && (
        <WizardStepsSticky
          currentStep={step}
          onStepClick={handleStepClick}
          selectedChannel={selectedChannel}
          isVisible={isStickyVisible}
        />
      )}
      <main ref={mainContentRef} className="app-main">
        {location.pathname === '/' && <VideoGeneration />}
        {location.pathname === '/jobs' && <VideoJobsHistory />}
        {location.pathname === '/settings' && <ChannelSettings />}
        {location.pathname === '/automation-debug' && <AutomationDebug />}
      </main>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  )
}

export default App

