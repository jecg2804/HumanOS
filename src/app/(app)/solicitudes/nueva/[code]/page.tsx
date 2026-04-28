import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMe } from '@/lib/auth/getMe';
import { createServerClient } from '@/lib/supabase/server';
import { isP1Code } from '@/lib/forms/registry';
import type { RequestTypeCode } from '@/lib/approvals/chains';
import { VacacionesForm } from '@/components/forms/VacacionesForm';
import { AccionPersonalForm } from '@/components/forms/AccionPersonalForm';
import { PrestamoForm } from '@/components/forms/PrestamoForm';
import { ActualizacionDatosForm } from '@/components/forms/ActualizacionDatosForm';
import { ReclamoPagoForm } from '@/components/forms/ReclamoPagoForm';
import {
  type ActualizacionDatosData,
  ESTADOS_CIVILES,
  type EstadoCivil,
} from '@/lib/forms/schemas/actualizacion-datos';
import type { Person } from '@/types/database';

const CODE_BY_SLUG: Record<string, RequestTypeCode> = {
  vacaciones: 'VACACIONES',
  accion_personal: 'ACCION_PERSONAL',
  prestamo: 'PRESTAMO',
  actualizacion_datos: 'ACTUALIZACION_DATOS',
  reclamo_pago: 'RECLAMO_PAGO',
};

const TITLE: Record<RequestTypeCode, string> = {
  VACACIONES: 'Solicitud de vacaciones',
  ACCION_PERSONAL: 'Acción de personal',
  PRESTAMO: 'Solicitud de préstamo',
  ACTUALIZACION_DATOS: 'Actualización de datos personales',
  RECLAMO_PAGO: 'Reclamo sobre pago',
};

export default async function NuevaSolicitudFormPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: slug } = await params;
  const code = CODE_BY_SLUG[slug.toLowerCase()];
  if (!code || !isP1Code(code)) notFound();

  const me = await getMe();
  const supa = await createServerClient();

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="text-sm text-neutral-500">
        <Link href="/solicitudes/nueva" className="hover:underline">
          Nueva solicitud
        </Link>{' '}
        / <span>{TITLE[code]}</span>
      </nav>
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold">{TITLE[code]}</h1>
      </header>

      <RequesterCard me={me} />

      {code === 'VACACIONES' && <VacacionesForm />}
      {code === 'ACCION_PERSONAL' && (
        <AccionPersonalForm
          me={{ id: me.id, name: me.name, role: me.role }}
          subordinates={await loadSubordinates(supa, me.id)}
        />
      )}
      {code === 'PRESTAMO' && <PrestamoForm />}
      {code === 'ACTUALIZACION_DATOS' && (
        <ActualizacionDatosForm initialValues={buildActDatosInitial(me)} />
      )}
      {code === 'RECLAMO_PAGO' && <ReclamoPagoForm />}
    </div>
  );
}

function RequesterCard({ me }: { me: { name: string; code: string; cedula: string | null; department: string | null; position: string | null; office: string | null } }) {
  return (
    <div className="rounded-md border bg-neutral-50 p-4 text-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Solicitante</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <span className="text-neutral-500">Nombre:</span> <strong>{me.name}</strong>
        </div>
        <div>
          <span className="text-neutral-500">Código:</span> {me.code}
        </div>
        {me.cedula && (
          <div>
            <span className="text-neutral-500">Cédula:</span> {me.cedula}
          </div>
        )}
        {me.department && (
          <div>
            <span className="text-neutral-500">Departamento:</span> {me.department}
          </div>
        )}
        {me.position && (
          <div className="col-span-2">
            <span className="text-neutral-500">Cargo:</span> {me.position}
          </div>
        )}
        {me.office && (
          <div className="col-span-2">
            <span className="text-neutral-500">Oficina:</span> {me.office}
          </div>
        )}
      </div>
    </div>
  );
}

async function loadSubordinates(
  supa: Awaited<ReturnType<typeof createServerClient>>,
  meId: string,
): Promise<Array<{ id: string; name: string; code: string }>> {
  const { data } = await supa
    .from('people')
    .select('id, name, code')
    .eq('supervisor_id', meId)
    .eq('status', 'Activo')
    .order('name');
  return (data ?? []) as Array<{ id: string; name: string; code: string }>;
}

function buildActDatosInitial(me: Person): ActualizacionDatosData {
  const [calle, apto] = splitAddress(me.address ?? '');
  const estadoCivil: EstadoCivil = (ESTADOS_CIVILES as readonly string[]).includes(me.marital_status ?? '')
    ? (me.marital_status as EstadoCivil)
    : 'Soltero(a)';

  return {
    direccion: {
      calle_barriada: calle,
      apartamento_casa_no: apto,
    },
    telefono_casa: '',
    celular_personal: me.phone ?? '',
    estado_civil: estadoCivil,
    pareja: undefined,
    dependientes: [],
  };
}

function splitAddress(addr: string): [string, string] {
  if (!addr) return ['', ''];
  const idx = addr.indexOf(',');
  if (idx === -1) return [addr, ''];
  return [addr.slice(0, idx).trim(), addr.slice(idx + 1).trim()];
}
