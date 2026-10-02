import { formatEuroCents } from '@/lib/admin/funnel';

type Props = {
  leads: number;
  rdv: number;
  signed: number;
  avgCostCents: number | null;
};

const nf = new Intl.NumberFormat('fr-FR');

export default function FunnelKpis({ leads, rdv, signed, avgCostCents }: Props) {
  const items: { label: string; value: string }[] = [
    { label: 'Leads', value: nf.format(leads) },
    { label: 'RDV', value: nf.format(rdv) },
    { label: 'Signés', value: nf.format(signed) },
    { label: 'Coût par RDV (moyen)', value: formatEuroCents(avgCostCents) },
  ];
  return (
    <div className="pt-funnel-kpis">
      {items.map((i) => (
        <div key={i.label} className="pt-funnel-kpi">
          <span className="pt-funnel-kpi-label">{i.label}</span>
          <span className="pt-funnel-kpi-value">{i.value}</span>
        </div>
      ))}
    </div>
  );
}
