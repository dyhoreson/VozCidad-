import { SectionTitle } from '../../../components/ui/SectionTitle'
import { TransparencySection } from '../components/TransparencySection'

export function PublicDataPage() {
  return <div className="page-wrap transparency-page public-data-page">
    <SectionTitle
      eyebrow="DADOS ABERTOS · FONTES OFICIAIS"
      title="Representantes e dados públicos"
      description="Consulte representantes federais de todo o país e dados de orçamento e transparência."
    />
    <TransparencySection />
  </div>
}
