import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Home as HomePage } from './pages/Home'
import { MapPage } from './features/map/pages/MapPage'
import { PoliticiansPage } from './features/politicians/pages/PoliticiansPage'
import { VotesPage } from './features/politicians/pages/VotesPage'
import { CivicProfilePage } from './features/politicians/pages/CivicProfilePage'
import { ManagementPage } from './features/politicians/pages/ManagementPage'
import { PoliticianDetailsPage } from './features/politicians/pages/PoliticianDetailsPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

const DirectContactPage = lazy(() => import('./features/direct-contact/pages/DirectContactPage').then(module => ({ default: module.DirectContactPage })))
const MyProtocolsPage = lazy(() => import('./features/direct-contact/pages/MyProtocolsPage').then(module => ({ default: module.MyProtocolsPage })))
const RequestInboxPage = lazy(() => import('./features/direct-contact/pages/RequestInboxPage').then(module => ({ default: module.RequestInboxPage })))
const TransparencyPage = lazy(() => import('./features/transparency/pages/TransparencyPage').then(module => ({ default: module.TransparencyPage })))
const PublicDataPage = lazy(() => import('./features/transparency/pages/PublicDataPage').then(module => ({ default: module.PublicDataPage })))
const HelpPage = lazy(() => import('./features/help/HelpPage').then(module => ({ default: module.HelpPage })))
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then(module => ({ default: module.ProfilePage })))
const AdminPage = lazy(() => import('./features/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })))

export default function App() {
  return <AppLayout><Suspense fallback={<div className="route-loading">Carregando página…</div>}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/mapa" element={<MapPage />} />
    <Route path="/representantes" element={<PoliticiansPage />} />
    <Route path="/representantes/:profileId" element={<CivicProfilePage />} />
    <Route path="/politicos/:profileId" element={<PoliticianDetailsPage />} />
    <Route path="/gestao" element={<ProtectedRoute><ManagementPage /></ProtectedRoute>} />
    <Route path="/gestao/solicitacoes" element={<ProtectedRoute><RequestInboxPage /></ProtectedRoute>} />
    <Route path="/votacoes" element={<VotesPage />} />
    <Route path="/votacoes/:billId" element={<VotesPage />} />
    <Route path="/contato" element={<ProtectedRoute><DirectContactPage /></ProtectedRoute>} />
    <Route path="/meus-protocolos" element={<ProtectedRoute><MyProtocolsPage /></ProtectedRoute>} />
    <Route path="/transparencia" element={<TransparencyPage />} />
    <Route path="/dados-abertos" element={<PublicDataPage />} />
    <Route path="/ajuda" element={<HelpPage />} />
    <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></AppLayout>
}
