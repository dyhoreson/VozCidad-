import { useEffect, useState } from 'react'
import { Award, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const tiers = [
  { min: 0, name: 'Cidadão Ativo', next: 100 },
  { min: 100, name: 'Fiscal do RN', next: 500 },
  { min: 500, name: 'Voz da Comunidade', next: 1000 },
  { min: 1000, name: 'Agente de Transformação', next: null },
]

export function BadgeCard({ points = 0, userId }: { points?: number; userId?: string }) {
  const [syncedPoints, setSyncedPoints] = useState<number | null>(null)
  useEffect(() => {
    const client = supabase
    if (!userId || !client) return
    let active = true
    const refresh = async () => {
      const { data } = await client.from('profiles').select('points').eq('id', userId).maybeSingle()
      if (active && data) setSyncedPoints(data.points)
    }
    void refresh()
    const channel = client.channel(`profile-points:${userId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, payload => {
      const updatedPoints = (payload.new as { points?: unknown }).points
      if (active && typeof updatedPoints === 'number') setSyncedPoints(updatedPoints)
    }).subscribe()
    return () => { active = false; void client.removeChannel(channel) }
  }, [userId])
  const currentPoints = syncedPoints ?? points
  const tier = [...tiers].reverse().find(item => currentPoints >= item.min) ?? tiers[0]
  const progress = tier.next ? Math.min(100, ((currentPoints - tier.min) / (tier.next - tier.min)) * 100) : 100
  return <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm" aria-label="Pontuação cívica">
    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Award size={20} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Sua jornada cívica</p><h3 className="font-semibold text-slate-900">{tier.name}</h3></div><span className="flex items-center gap-1 font-bold text-amber-700"><Star size={15} fill="currentColor" />{currentPoints}</span></div>
    <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{tier.next ? 'Próximo nível' : 'Nível máximo'}</span><span>{tier.next ? `${Math.max(0, tier.next - currentPoints)} pontos restantes` : 'Parabéns!'}</span></div><div className="h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} /></div></div>
    <p className="mt-3 text-xs leading-relaxed text-slate-600">Você recebe 50 pontos quando uma ocorrência sua chega a “Reparo Realizado”.</p>
  </section>
}
