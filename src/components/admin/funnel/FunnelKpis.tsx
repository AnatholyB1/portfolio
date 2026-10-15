import { conversionRate, formatEuroCents } from '@/lib/admin/funnel';

type Props = {
  leads: number;
  rdv: number;
  signed: number;
  avgCostCents: number | null;
};

const nf = new Intl.NumberFormat('fr-FR');

export default function FunnelKpis({ leads, rdv, signed, avgCostCents }: Props) {
  // Les taux sont dérivés des totaux affichés (même fonction que le tableau) : aucune règle nouvelle.
  const rdvRate = conversionRate(rdv, leads);
  const signedRate = conversionRate(signed, rdv);
  const items: { label: string; value: string; sub?: string }[] = [
    { label: 'Leads', value: nf.format(leads) },
    { label: 'RDV', value: nf.format(rdv), sub: rdvRate ? `${rdvRate} des leads` : undefined },
    { label: 'Signés', value: nf.format(signed), sub: signedRate ? `${signedRate} des RDV` : undefined },
    { label: 'Coût par RDV (moyen)', value: formatEuroCents(avgCostCents) },
  ];
  return (
    <div className="pt-funnel-kpis">
      {items.map((i) => (
        <div key={i.label} className="pt-funnel-kpi">
          <span className="pt-funnel-kpi-label">{i.label}</span>
          <span className="pt-funnel-kpi-value">{i.value}</span>
          {i.sub ? <span className="pt-funnel-kpi-sub">{i.sub}</span> : null}
        </div>
      ))}
    </div>
  );
}
