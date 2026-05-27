export default function DashboardPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-primary">Inicio</h1>
      <p className="text-muted-foreground">
        Bienvenido a HumanOS. Selecciona una opcion en el menu lateral para comenzar.
      </p>
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          El tablero detallado se completara en el Group 7 (dashboards admin + metricas + accesos rapidos).
        </p>
      </div>
    </div>
  );
}
