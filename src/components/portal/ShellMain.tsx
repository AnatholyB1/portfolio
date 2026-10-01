// Conteneur principal : 960px (client) ou 1120px (admin), gouttières 16/32px (via portal.css).
interface ShellMainProps {
  width: 'client' | 'admin';
  children: React.ReactNode;
}

export default function ShellMain({ width, children }: ShellMainProps) {
  return (
    <main className="pt-main" data-width={width}>
      {children}
    </main>
  );
}
