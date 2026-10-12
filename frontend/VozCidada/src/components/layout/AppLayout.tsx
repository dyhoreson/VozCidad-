import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  FileText,
  House,
  Inbox,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  Vote,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { AuthModal } from '../../features/auth/components/AuthModal'
import { BadgeCard } from '../../features/gamification/BadgeCard'

const ONBOARDING_KEY = 'vozcidada_mobile_onboarding_shown'

const nav = [
  { label: 'Visão geral', to: '/', icon: House },
  { label: 'Mapa de ocorrências', to: '/mapa', icon: Map },
  { label: 'Representantes', to: '/representantes', icon: Users },
  { label: 'Dados abertos', to: '/dados-abertos', icon: Building2 },
  { label: 'Voto popular', to: '/votacoes', icon: Vote },
]

const quickLinks: Array<{
  title: string
  description: string
  to: string
  icon: LucideIcon
  image?: string
}> = [
  {
    title: 'Mapa de Ocorrências',
    description: 'Visualize e relate demandas e problemas na sua comunidade.',
    to: '/mapa',
    icon: MapPin,
    image: '/onboarding/mapa-ocorrencias.png',
  },
  {
    title: 'Voto Popular',
    description: 'Opine diretamente nos Projetos de Lei e propostas em pauta.',
    to: '/votacoes',
    icon: Vote,
    image: '/onboarding/voto-popular.png',
  },
  {
    title: 'Dados Abertos',
    description: 'Consulte gastos, licitações e transparência pública.',
    to: '/dados-abertos',
    icon: Database,
    image: '/onboarding/dados-abertos.png',
  },
  {
    title: 'Meus Protocolos',
    description: 'Acompanhe o status das suas solicitações e chamados enviados.',
    to: '/meus-protocolos',
    icon: FileText,
    image: '/onboarding/meus-protocolos.png',
  },
]

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const { user, profile, loading, signOut, openAuthModal } = useAuth()

  const dismissOnboarding = useCallback(() => {
    try {
      sessionStorage.setItem(ONBOARDING_KEY, 'true')
    } catch {
      // The onboarding still closes for this render if session storage is unavailable.
    }
    setOnboardingOpen(false)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const updateViewport = () => {
      const mobileViewport = mediaQuery.matches
      setIsMobile(mobileViewport)
      if (mobileViewport) {
        try {
          if (sessionStorage.getItem(ONBOARDING_KEY) !== 'true') setOnboardingOpen(true)
        } catch {
          setOnboardingOpen(true)
        }
      } else {
        setOnboardingOpen(false)
      }
    }
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  }, [])

  useEffect(() => {
    const onboardingVisible = onboardingOpen && isMobile
    if (!onboardingVisible && !installOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (onboardingVisible) dismissOnboarding()
      else setInstallOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onboardingOpen, isMobile, installOpen, dismissOnboarding])

  function openQuickLink(path: string) {
    dismissOnboarding()
    navigate(path)
  }

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
    setInstallOpen(false)
  }

  const mobileInstructions = /iphone|ipad|ipod/i.test(navigator.userAgent)
    ? 'No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.'
    : 'No menu do navegador, escolha “Instalar app” ou “Adicionar à tela inicial”.'

  return <>
    <div className="app-shell">
      {open && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <Link to="/" aria-label="Voz Cidadã RN — início" onClick={() => setOpen(false)}>
            <img className="brand-logo" src="/voz-cidada-logo.png" alt="Voz Cidadã — Cuidar da cidade começa com você" />
          </Link>
          <button className="icon-button close-menu" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
        <div className="state-card">
          <span className="state-flag">RN</span>
          <div><strong>Rio Grande do Norte</strong></div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-heading">MENU PRINCIPAL</p>
        <nav className="nav-list" aria-label="Menu principal">
          {nav.map(({ label, to, icon: Icon }) => <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} /><span>{label}</span>
            {label === 'Voto popular' && <span className="nav-count">3</span>}
          </NavLink>)}
          {(profile?.role === 'politico' || profile?.role === 'empresa') && <NavLink
            to="/gestao"
            onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Building2 size={18} /><span>Painel de gestão</span>
          </NavLink>}
        </nav>
        <p className="nav-heading tools-heading">ACOMPANHAMENTO</p>
        <div className="nav-list">
          <NavLink to="/contato" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><MessageCircle size={18} /><span>Canal direto</span></NavLink>
          <NavLink to="/meus-protocolos" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><FileText size={18} /><span>Meus protocolos</span></NavLink>
          <NavLink to="/transparencia" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><BarChart3 size={18} /><span>Indicadores cívicos</span></NavLink>
          {(profile?.role === 'politico' || profile?.role === 'empresa') && <NavLink to="/gestao/solicitacoes" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Inbox size={18} /><span>Mensagens recebidas</span></NavLink>}
          <NavLink to="/mapa" onClick={() => setOpen(false)} className="nav-link"><ShieldCheck size={18} /><span>Minhas manifestações</span></NavLink>
        </div>
        {profile?.role === 'super_admin' && profile.email.toLowerCase() === 'dyhoreson.daniel@gmail.com' && <NavLink to="/admin" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><ShieldCheck size={18} /><span>Super administrador</span></NavLink>}
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-icon"><CircleHelp size={17} /></div>
          <strong>Como podemos ajudar?</strong>
          <p>Conheça seus direitos e saiba como participar.</p>
          <Link to="/ajuda">Acessar central <span>→</span></Link>
        </div>
        {user && <div className="px-3 pb-4"><BadgeCard points={profile?.points ?? 0} userId={user.id} /></div>}
        <div className="profile">
          <Link to="/profile" className="avatar avatar-user" aria-label="Abrir meu perfil">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : profile?.fullName.slice(0, 2).toUpperCase() ?? 'VC'}
          </Link>
          <div className="profile-info">
            <Link to="/profile"><strong>{loading ? 'Carregando...' : profile?.fullName ?? 'Visitante'}</strong></Link>
            <small>{profile?.isDemo ? 'Conta de demonstração' : profile?.email ?? 'Acesse sua conta'}</small>
          </div>
          {user ? <><Link to="/profile" className="profile-action" title="Editar perfil">Perfil</Link><button className="profile-action danger-button" onClick={() => void signOut()} title="Sair">Sair</button></> : <ChevronDown size={16} />}
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <Link to="/" className="topbar-brand" aria-label="Voz Cidadã RN - início"><img src="/voz-cidada-logo.png" alt="Voz Cidadã RN" /></Link>
          <div className="breadcrumb">Portal cidadão <span>/</span> <strong>Rio Grande do Norte</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><input placeholder="Buscar ocorrências, projetos..." aria-label="Buscar" /><kbd>⌘ K</kbd></label>
            <button className="install-app-button" onClick={() => setInstallOpen(true)} aria-label="Instalar ou baixar o aplicativo">
              <Download size={16} /><span className="install-app-label">Instalar App</span>
            </button>
            <button className="icon-button notification-button" aria-label="Notificações"><Bell size={19} /><i /></button>
            {!user && <button className="login-button" onClick={openAuthModal}><span className="login-full">Entrar na plataforma</span><span className="login-short">Entrar</span></button>}
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>© 2025 Voz Cidadã RN</span>
          <span>Feito para fortalecer a democracia <span className="footer-heart">♥</span></span>
          <a href="mailto:contato@vozcidada.rn.gov.br">Contato</a>
        </footer>
      </div>
    </div>

    {onboardingOpen && isMobile && <div className="mobile-onboarding-overlay fixed inset-0 z-[9999] flex flex-col justify-center overflow-hidden bg-slate-950 p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="mobile-onboarding-title">
      <div className="mobile-onboarding-content mx-auto w-full max-w-4xl">
        <div className="mobile-onboarding-heading mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-300">Voz Cidadã · Rio Grande do Norte</p>
            <h1 id="mobile-onboarding-title" className="text-3xl font-bold text-white sm:text-4xl">Bem-vindo à participação cidadã</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-200">Escolha por onde quer começar. Você também pode acessar a plataforma completa a qualquer momento.</p>
          </div>
          <button className="mobile-onboarding-close" onClick={dismissOnboarding} aria-label="Fechar apresentação" autoFocus><X size={21} /></button>
        </div>

        <div className="mobile-onboarding-grid my-4 grid grid-cols-2 gap-3 sm:gap-4">
          {quickLinks.map(({ title, description, to, icon: Icon, image }) => <button
            key={title}
            type="button"
            className="mobile-onboarding-card group flex min-h-0 flex-col items-center rounded-xl border border-slate-700/80 bg-slate-800/90 p-3 text-center text-white transition-all hover:border-emerald-500 focus-visible:outline-emerald-300 sm:p-4"
            onClick={() => openQuickLink(to)}
          >
            {image
              ? <img src={image} alt="" aria-hidden="true" className="mobile-onboarding-icon mb-2 h-10 w-10 object-contain" />
              : <span className="mobile-onboarding-icon mb-2 grid h-10 w-10 place-items-center rounded-xl bg-emerald-300/15 text-emerald-200"><Icon size={22} aria-hidden="true" /></span>}
            <span className="min-w-0">
              <strong className="mt-1 block text-sm font-semibold text-white sm:text-base">{title}</strong>
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-300">{description}</span>
            </span>
          </button>)}
        </div>

        <button type="button" className="mobile-onboarding-enter mt-5 w-full rounded-xl bg-emerald-500 px-5 py-4 text-base font-bold text-white transition hover:bg-emerald-400 sm:w-auto" onClick={dismissOnboarding}>
          Acessar Plataforma
        </button>
      </div>
    </div>}

    {installOpen && <div className="install-app-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setInstallOpen(false) }}>
      <section className="install-app-dialog" role="dialog" aria-modal="true" aria-labelledby="install-app-title">
        <button className="auth-close" onClick={() => setInstallOpen(false)} aria-label="Fechar" autoFocus><X size={19} /></button>
        <div className="auth-shield"><Smartphone size={21} /></div>
        <h2 id="install-app-title">Acesse o Voz Cidadã pelo seu dispositivo</h2>
        {installPrompt ? <>
          <p>Instale o aplicativo para abrir a plataforma direto da tela inicial.</p>
          <button className="auth-submit" onClick={() => void installApp()}><Download size={17} /> Instalar aplicativo</button>
        </> : <>
          <p>A plataforma funciona no navegador; ainda não há um aplicativo independente ou arquivo APK para baixar.</p>
          <p className="install-app-instructions">{mobileInstructions}</p>
          <button className="auth-submit" onClick={() => setInstallOpen(false)}>Entendi</button>
        </>}
      </section>
    </div>}

    <AuthModal />
  </>
}
