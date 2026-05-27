export default function ErrorReportedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">Reporte enviado</h1>
        <p className="text-gray-700 mt-4">
          Hemos notificado al equipo de Recursos Humanos sobre el error en tus datos. Te
          contactaremos cuando esté resuelto.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Cuando recibas confirmación de RRHH, puedes volver a abrir este enlace para continuar tu
          onboarding desde el inicio.
        </p>
      </div>
    </main>
  );
}
