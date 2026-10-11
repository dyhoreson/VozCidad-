import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BarChart3, Bell, Building2, ChevronDown, CircleHelp, FileText, House, Inbox, Map, Menu, MessageCircle, Search, ShieldCheck, Users, Vote, X } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { AuthModal } from '../../features/auth/components/AuthModal'
import { BadgeCard } from '../../features/gamification/BadgeCard'

const nav = [
  { label: 'Visão geral', to: '/', icon: House }, { label: 'Mapa de ocorrências', to: '/mapa', icon: Map },
  { label: 'Representantes', to: '/representantes', icon: Users }, { label: 'Dados abertos', to: '/dados-abertos', icon: Building2 }, { label: 'Voto popular', to: '/votacoes', icon: Vote },
]
export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user, profile, loading, signOut, openAuthModal } = useAuth()
  return <><div className="app-shell">
    {open && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><Link to="/" aria-label="Voz Cidadã RN — início" onClick={() => setOpen(false)}><img className="brand-logo" src="/voz-cidada-logo.png" alt="Voz Cidadã — Cuidar da cidade começa com você" /></Link><button className="icon-button close-menu" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div><div className="state-card"><span className="state-flag">RN</span><div><strong>Rio Grande do Norte</strong></div><ChevronDown size={15} /></div>
      <p className="nav-heading">MENU PRINCIPAL</p>
      <nav className="nav-list">{nav.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Voto popular' && <span className="nav-count">3</span>}</NavLink>)}{(profile?.role === 'politico' || profile?.role === 'empresa') && <NavLink to="/gestao" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Building2 size={18} /><span>Painel de gestão</span></NavLink>}</nav>
      <p className="nav-heading tools-heading">ACOMPANHAMENTO</p>
      <div className="nav-list"><NavLink to="/contato" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><MessageCircle size={18} /><span>Canal direto</span></NavLink><NavLink to="/meus-protocolos" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><FileText size={18} /><span>Meus protocolos</span></NavLink><NavLink to="/transparencia" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><BarChart3 size={18} /><span>Indicadores cívicos</span></NavLink>{(profile?.role === 'politico' || profile?.role === 'empresa') && <NavLink to="/gestao/solicitacoes" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Inbox size={18} /><span>Mensagens recebidas</span></NavLink>}<NavLink to="/mapa" className="nav-link"><ShieldCheck size={18} /><span>Minhas manifestações</span></NavLink></div>
      {profile?.role === 'super_admin' && profile.email.toLowerCase() === 'dyhoreson.daniel@gmail.com' && <NavLink to="/admin" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><ShieldCheck size={18} /><span>Super administrador</span></NavLink>}
      <div className="sidebar-spacer" /><div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Como podemos ajudar?</strong><p>Conheça seus direitos e saiba como participar.</p><Link to="/ajuda">Acessar central <span>→</span></Link></div>
      {user && <div className="px-3 pb-4"><BadgeCard points={profile?.points ?? 0} userId={user.id} /></div>}
      <div className="profile"><Link to="/profile" className="avatar avatar-user" aria-label="Abrir meu perfil">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : profile?.fullName.slice(0, 2).toUpperCase() ?? 'VC'}</Link><div className="profile-info"><Link to="/profile"><strong>{loading ? 'Carregando...' : profile?.fullName ?? 'Visitante'}</strong></Link><small>{profile?.isDemo ? 'Conta de demonstração' : profile?.email ?? 'Acesse sua conta'}</small></div>{user ? <><Link to="/profile" className="profile-action" title="Editar perfil">Perfil</Link><button className="profile-action danger-button" onClick={() => void signOut()} title="Sair">Sair</button></> : <ChevronDown size={16} />}</div>
    </aside>
    <div className="main-column"><header className="topbar"><button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button><Link to="/" className="topbar-brand" aria-label="Voz Cidada RN - inicio"><img src="/voz-cidada-logo.png" alt="Voz Cidada RN" /></Link><div className="breadcrumb">Portal cidadão <span>/</span> <strong>Rio Grande do Norte</strong></div><div className="topbar-actions"><label className="search-box"><Search size={16} /><input placeholder="Buscar ocorrências, projetos..." aria-label="Buscar" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notificações"><Bell size={19} /><i /></button>{!user && <button className="login-button" onClick={openAuthModal}><span className="login-full">Entrar na plataforma</span><span className="login-short">Entrar</span></button>}</div></header><main>{children}</main><footer className="footer"><span>© 2025 Voz Cidadã RN</span><span>Feito para fortalecer a democracia <span className="footer-heart">♥</span></span><a href="mailto:contato@vozcidada.rn.gov.br">Contato</a></footer></div>
  </div><AuthModal /></>
}
