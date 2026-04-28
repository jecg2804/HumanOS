import { VacacionesDetail } from '@/components/forms/VacacionesDetail';
import { AccionPersonalDetail } from '@/components/forms/AccionPersonalDetail';
import { PrestamoDetail } from '@/components/forms/PrestamoDetail';
import { ActualizacionDatosDetail } from '@/components/forms/ActualizacionDatosDetail';
import { ReclamoPagoDetail } from '@/components/forms/ReclamoPagoDetail';
import type { VacacionesData } from '@/lib/forms/schemas/vacaciones';
import type { AccionPersonalData } from '@/lib/forms/schemas/accion-personal';
import type { PrestamoData } from '@/lib/forms/schemas/prestamo';
import type { ActualizacionDatosData } from '@/lib/forms/schemas/actualizacion-datos';
import type { ReclamoPagoData } from '@/lib/forms/schemas/reclamo-pago';

type Attachment = { name: string; url: string; mime: string; size: number };

type Props = {
  typeCode: string;
  formData: Record<string, unknown>;
  attachments?: Attachment[];
  empleadoObjetoName?: string;
};

export function RequestDetailRenderer({
  typeCode,
  formData,
  attachments,
  empleadoObjetoName,
}: Props) {
  switch (typeCode) {
    case 'VACACIONES':
      return <VacacionesDetail data={formData as unknown as VacacionesData} />;
    case 'ACCION_PERSONAL':
      return (
        <AccionPersonalDetail
          data={formData as unknown as AccionPersonalData}
          empleado_objeto_name={empleadoObjetoName}
        />
      );
    case 'PRESTAMO':
      return <PrestamoDetail data={formData as unknown as PrestamoData} />;
    case 'ACTUALIZACION_DATOS':
      return (
        <ActualizacionDatosDetail
          data={formData as unknown as ActualizacionDatosData & { _changes?: string[] }}
        />
      );
    case 'RECLAMO_PAGO':
      return (
        <ReclamoPagoDetail
          data={formData as unknown as ReclamoPagoData}
          attachments={attachments ?? []}
        />
      );
    default:
      return (
        <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      );
  }
}
