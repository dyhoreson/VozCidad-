import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './features/home/pages/HomePage'
import { MapPage } from './features/map/pages/MapPage'
import { PoliticiansPage } from './features/politicians/pages/PoliticiansPage'
import { VotesPage } from './features/politicians/pages/VotesPage'
import { CivicProfilePage } from './features/politicians/pages/CivicProfilePage'
import { ManagementPage } from './features/politicians/pages/ManagementPage'

const DirectContactPage = lazy(() => import('./features/direct-contact/pages/DirectContactPage').then(module => ({ default: module.DirectContactPage })))
const MyProtocolsPage = lazy(() => import('./features/direct-contact/pages/MyProtocolsPage').then(module => ({ default: module.MyProtocolsPage })))
const RequestInboxPage = lazy(() => import('./features/direct-contact/pages/RequestInboxPage').then(module => ({ default: module.RequestInboxPage })))
const TransparencyPage = lazy(() => import('./features/transparency/pages/TransparencyPage').then(module => ({ default: module.TransparencyPage })))

export default function App() {
  return <AppLayout><Suspense fallback={<div className="route-loading">Carregando página…</div>}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/mapa" element={<MapPage />} />
    <Route path="/representantes" element={<PoliticiansPage />} />
    <Route path="/representantes/:profileId" element={<CivicProfilePage />} />
    <Route path="/gestao" element={<ManagementPage />} />
    <Route path="/gestao/solicitacoes" element={<RequestInboxPage />} />
    <Route path="/votacoes" element={<VotesPage />} />
    <Route path="/contato" element={<DirectContactPage />} />
    <Route path="/meus-protocolos" element={<MyProtocolsPage />} />
    <Route path="/transparencia" element={<TransparencyPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></AppLayout>
}
