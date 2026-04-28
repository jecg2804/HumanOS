'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  reclamoPagoSchema,
  type ReclamoPagoData,
  RECLAMO_CATEGORIAS,
  makeEmptyReclamoTabla,
} from '@/lib/forms/schemas/reclamo-pago';
import { submitRequestAction } from '@/lib/approvals/submit';
import { collectErrorMessages } from '@/lib/forms/error-utils';
import { createBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 año

function computeDiferencia(
  empleado: number | null,
  supervisor: number | null,
): number | null {
  if (empleado === null && supervisor === null) return null;
  return (empleado ?? 0) - (supervisor ?? 0);
}

function formatNumber(n: number | null): string {
  if (n === null) return '—';
  // Mostrar sin decimales si es entero, sino con 2 decimales.
  return Number.isInteger(n)
    ? n.toString()
    : n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ReclamoPagoForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const form = useForm<ReclamoPagoData>({
    resolver: zodResolver(reclamoPagoSchema),
    defaultValues: {
      periodo: { desde: '', hasta: '' },
      tabla: makeEmptyReclamoTabla(),
      descripcion: '',
    },
  });

  // Watch tabla para mostrar diferencia calculada en tiempo real.
  const tablaWatched = form.watch('tabla');
  const diferenciasCalculadas = useMemo(
    () =>
      tablaWatched.map((fila) =>
        computeDiferencia(fila.empleado, fila.supervisor),
      ),
    [tablaWatched],
  );

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const combined = [...pendingFiles];
    for (const file of incoming) {
      if (combined.length >= MAX_FILES) {
        setFileError(`Máximo ${MAX_FILES} archivos.`);
        break;
      }
      if (file.size > MAX_BYTES) {
        setFileError(`"${file.name}" excede el límite de 10MB.`);
        continue;
      }
      if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
        setFileError(
          `"${file.name}" no es un tipo permitido (jpg, png, webp, pdf).`,
        );
        continue;
      }
      // Evitar duplicados por nombre+tamaño.
      if (
        combined.some((f) => f.name === file.name && f.size === file.size)
      ) {
        continue;
      }
      combined.push(file);
    }
    setPendingFiles(combined);
    // Reset input para permitir re-seleccionar el mismo archivo si lo quitas.
    e.target.value = '';
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: ReclamoPagoData) {
    setSubmitError(null);
    setUploadStatus(null);

    // Inyectar diferencia calculada en cada fila antes del submit.
    const tablaConDiferencia = values.tabla.map((fila) => ({
      ...fila,
      diferencia: computeDiferencia(fila.empleado, fila.supervisor),
    }));
    const formData: ReclamoPagoData = {
      ...values,
      tabla: tablaConDiferencia,
    };

    // Subir archivos si los hay.
    const attachments: Array<{
      name: string;
      url: string;
      mime: string;
      size: number;
    }> = [];

    if (pendingFiles.length > 0) {
      try {
        const supa = createBrowserClient();
        const tempUuid =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          setUploadStatus(`Subiendo ${i + 1} de ${pendingFiles.length}…`);

          // Sanitizar nombre: reemplazar caracteres problemáticos.
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${tempUuid}/${safeName}`;

          const { error: uploadErr } = await supa.storage
            .from('humanos-attachments')
            .upload(path, file, {
              contentType: file.type,
              upsert: false,
            });
          if (uploadErr) {
            throw new Error(
              `Error subiendo ${file.name}: ${uploadErr.message}`,
            );
          }

          const { data: signed, error: signErr } = await supa.storage
            .from('humanos-attachments')
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
          if (signErr || !signed?.signedUrl) {
            throw new Error(
              `No se pudo generar URL de "${file.name}": ${signErr?.message ?? 'desconocido'}`,
            );
          }

          attachments.push({
            name: file.name,
            url: signed.signedUrl,
            mime: file.type,
            size: file.size,
          });
        }
        setUploadStatus(null);
      } catch (e) {
        setUploadStatus(null);
        setSubmitError(
          e instanceof Error ? e.message : 'Error al subir archivos',
        );
        return;
      }
    }

    try {
      const res = await submitRequestAction({
        typeCode: 'RECLAMO_PAGO',
        formData,
        attachments,
      });
      router.push(`/solicitudes/${res.requestId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al enviar');
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6 max-w-3xl"
    >
      <Card>
        <CardHeader>
          <CardTitle>Período en disputa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="periodo_desde" className="text-xs">
                Desde
              </Label>
              <Input
                id="periodo_desde"
                type="date"
                {...form.register('periodo.desde')}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="periodo_hasta" className="text-xs">
                Hasta
              </Label>
              <Input
                id="periodo_hasta"
                type="date"
                {...form.register('periodo.hasta')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del reclamo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-neutral-600 mb-3">
            Ingresa lo que tú reportaste y lo que figura como pagado/cobrado.
            La diferencia se calcula automáticamente.
          </p>

          {/* Vista de escritorio */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">Categoría</th>
                  <th className="py-2 px-2 font-medium">Empleado</th>
                  <th className="py-2 px-2 font-medium">Supervisor</th>
                  <th className="py-2 pl-2 font-medium text-right">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {RECLAMO_CATEGORIAS.map((cat, i) => (
                  <tr key={cat} className="border-b last:border-0">
                    <td className="py-2 pr-3 align-middle">{cat}</td>
                    <td className="py-2 px-2 align-middle">
                      <input
                        type="hidden"
                        value={cat}
                        {...form.register(`tabla.${i}.categoria` as const)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Empleado — ${cat}`}
                        {...form.register(`tabla.${i}.empleado` as const, {
                          setValueAs: (v) =>
                            v === '' || v === null || v === undefined
                              ? null
                              : Number(v),
                        })}
                      />
                    </td>
                    <td className="py-2 px-2 align-middle">
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Supervisor — ${cat}`}
                        {...form.register(`tabla.${i}.supervisor` as const, {
                          setValueAs: (v) =>
                            v === '' || v === null || v === undefined
                              ? null
                              : Number(v),
                        })}
                      />
                    </td>
                    <td className="py-2 pl-2 text-right font-medium tabular-nums">
                      {formatNumber(diferenciasCalculadas[i] ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista móvil — una tarjeta por fila */}
          <div className="md:hidden space-y-4">
            {RECLAMO_CATEGORIAS.map((cat, i) => (
              <div
                key={cat}
                className="rounded-md border border-neutral-200 p-3 space-y-2"
              >
                <p className="font-medium text-sm">{cat}</p>
                <input
                  type="hidden"
                  value={cat}
                  {...form.register(`tabla.${i}.categoria` as const)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`mob-emp-${i}`}
                      className="text-xs text-neutral-600"
                    >
                      Empleado
                    </Label>
                    <Input
                      id={`mob-emp-${i}`}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      {...form.register(`tabla.${i}.empleado` as const, {
                        setValueAs: (v) =>
                          v === '' || v === null || v === undefined
                            ? null
                            : Number(v),
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`mob-sup-${i}`}
                      className="text-xs text-neutral-600"
                    >
                      Supervisor
                    </Label>
                    <Input
                      id={`mob-sup-${i}`}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      {...form.register(`tabla.${i}.supervisor` as const, {
                        setValueAs: (v) =>
                          v === '' || v === null || v === undefined
                            ? null
                            : Number(v),
                      })}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-neutral-700 pt-1 border-t">
                  <span>Diferencia</span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(diferenciasCalculadas[i] ?? null)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descripción del problema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <Label htmlFor="descripcion" className="sr-only">
            Descripción
          </Label>
          <textarea
            id="descripcion"
            {...form.register('descripcion')}
            rows={5}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Describe el problema con detalle (mínimo 30 caracteres)."
          />
          <p className="text-xs text-neutral-600">
            Describe el problema con detalle.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprobante de pago (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-neutral-600">
            Adjunta foto o PDF del comprobante. Hasta {MAX_FILES} archivos, 10MB
            cada uno. Formatos: jpg, png, webp, pdf.
          </p>

          {pendingFiles.length < MAX_FILES && (
            <div className="space-y-1">
              <Label htmlFor="archivos" className="text-xs">
                Seleccionar archivos
              </Label>
              <input
                id="archivos"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFilesChange}
                className="block w-full text-sm file:mr-3 file:rounded file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-neutral-50"
              />
            </div>
          )}

          {fileError && <p className="text-sm text-red-600">{fileError}</p>}

          {pendingFiles.length > 0 && (
            <ul className="space-y-1.5">
              {pendingFiles.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{f.name}</p>
                    <p className="text-xs text-neutral-600">
                      {formatBytes(f.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(i)}
                    aria-label={`Quitar ${f.name}`}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FormErrors errors={form.formState.errors} />
      {uploadStatus && (
        <p className="text-sm text-neutral-700">{uploadStatus}</p>
      )}
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-2 sticky bottom-0 bg-white py-3 border-t md:border-t-0 md:relative md:bg-transparent">
        <Button
          type="submit"
          disabled={isSubmitting || uploadStatus !== null}
        >
          {isSubmitting || uploadStatus
            ? uploadStatus ?? 'Enviando…'
            : 'Enviar solicitud'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/solicitudes/nueva')}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function FormErrors({ errors }: { errors: FieldErrors<ReclamoPagoData> }) {
  const messages = collectErrorMessages(errors);
  if (messages.length === 0) return null;
  return (
    <ul className="text-sm text-red-600 space-y-0.5">
      {messages.map((m, i) => (
        <li key={i}>• {m}</li>
      ))}
    </ul>
  );
}
