'use server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getMe } from '@/lib/auth/getMe';

type FormDataAct = {
  direccion?: { calle_barriada?: string; apartamento_casa_no?: string };
  celular_personal?: string;
  estado_civil?: 'Soltero(a)' | 'Casado(a)' | 'Unido(a)';
  dependientes?: Array<{ nombre: string; parentesco: string }>;
};

export async function applyActDatosAction(requestId: string): Promise<void> {
  const me = await getMe();
  if (me.role !== 'hr_admin') {
    throw new Error('No autorizado: solo Recursos Humanos puede aplicar cambios al expediente.');
  }

  const supa = await createServerClient();

  const { data: req, error: reqErr } = await supa
    .from('requests')
    .select('id, status, requester_id, form_data, type_id')
    .eq('id', requestId)
    .single();
  if (reqErr || !req) throw new Error('Solicitud no encontrada');
  if (req.status !== 'Aprobada') {
    throw new Error('Solo solicitudes Aprobadas pueden aplicarse al expediente.');
  }

  const { data: type } = await supa
    .from('request_types')
    .select('code')
    .eq('id', req.type_id)
    .single();
  if (type?.code !== 'ACTUALIZACION_DATOS') {
    throw new Error('Esta acción solo aplica a solicitudes de Actualización de Datos.');
  }

  const fd = (req.form_data ?? {}) as FormDataAct;
  const updates: Record<string, unknown> = {};

  if (fd.direccion) {
    const addr = [fd.direccion.calle_barriada, fd.direccion.apartamento_casa_no]
      .filter((x): x is string => Boolean(x && x.trim()))
      .join(', ');
    if (addr) updates.address = addr;
  }
  if (fd.celular_personal && fd.celular_personal.trim()) {
    updates.phone = fd.celular_personal.trim();
  }
  if (fd.estado_civil) {
    updates.marital_status = fd.estado_civil;
  }
  if (Array.isArray(fd.dependientes)) {
    updates.num_kids = fd.dependientes.length;
  }

  if (Object.keys(updates).length > 0) {
    const { error: upErr } = await supa.from('people').update(updates).eq('id', req.requester_id);
    if (upErr) throw new Error(`Error al actualizar perfil: ${upErr.message}`);
  }

  const { error: rErr } = await supa
    .from('requests')
    .update({ status: 'Completada', date_resolved: new Date().toISOString() })
    .eq('id', requestId);
  if (rErr) throw new Error(`Error al cerrar solicitud: ${rErr.message}`);

  revalidatePath(`/solicitudes/${requestId}`);
  revalidatePath('/solicitudes');
  revalidatePath('/admin');
}
