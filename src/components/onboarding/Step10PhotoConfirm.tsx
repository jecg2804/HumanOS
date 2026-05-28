'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { resizeImage } from '@/lib/storage/avatars';
import {
  completeOnboardingAction,
  uploadOnboardingAvatarAction,
} from '@/lib/onboarding/actions';
import type { WizardState, WizardAction } from './WizardReducer';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function Step10PhotoConfirm({ state, dispatch }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setUploadError(null);
  };

  const tryUpload = async (): Promise<string | null> => {
    if (!file || !state.validated) return state.photo_path;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.append('invite_id', state.validated.invite_id);
      fd.append('person_id', state.validated.person_id);
      fd.append('photo', blob, 'current.jpg');
      const result = await uploadOnboardingAvatarAction(fd);
      if (!result.ok || !result.path) {
        throw new Error(result.error ?? 'Upload falló');
      }
      dispatch({ type: 'SET_PHOTO', path: result.path });
      return result.path;
    } catch (err) {
      setUploadError((err as Error).message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!state.validated) return;
    setSubmitting(true);
    setSubmitError(null);

    let photoPath: string | null = state.photo_path;
    if (file && !state.photo_path) {
      photoPath = await tryUpload();
      if (!photoPath && file) {
        const proceed = window.confirm(
          'La foto no se pudo subir. ¿Continuar sin foto o reintentar?\n' +
            'Aceptar = continuar sin foto. Cancelar = volver a intentar.'
        );
        if (!proceed) {
          setSubmitting(false);
          return;
        }
        photoPath = null;
      }
    }

    const result = await completeOnboardingAction({
      invite_id: state.validated.invite_id,
      person_id: state.validated.person_id,
      target_field: state.validated.target_field,
      normalized_target: state.validated.normalized_target,
      // Batch 3 NEW.A: send password always. completeOnboardingAction ignores
      // it when user already exists (multi-app silent merge). Tradeoff: user
      // types a password even if existing; we no longer reveal which they are.
      password: state.password,
      emergency: state.emergency,
      medical: state.medical,
      address: state.address,
      ack_ethics_at: state.ack_ethics_at!,
      ack_child_labor_at: state.ack_child_labor_at!,
      photo_path: photoPath,
    });

    if (!result.ok) {
      setSubmitError(result.message ?? 'Onboarding falló');
      setSubmitting(false);
      return;
    }

    router.push((result.data as { redirect_to: string }).redirect_to);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1B3A5C]">Foto de perfil (opcional)</h1>
      <p className="text-gray-700">
        Sube una foto para tu perfil interno (gafete, directorio). Puedes saltarte este paso y
        agregarla después desde tu perfil.
      </p>
      <div className="flex flex-col items-center gap-3">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Vista previa"
            width={128}
            height={128}
            unoptimized
            className="w-32 h-32 object-cover rounded-full border-2 border-gray-300"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
            Sin foto
          </div>
        )}
        <label className="cursor-pointer text-sm text-[#0A6EBD] underline">
          {file ? 'Cambiar foto' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </label>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </div>
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          disabled={submitting}
          className="px-4 py-2 border rounded"
        >
          Atrás
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="flex-1 bg-[#1A7F5A] text-white py-3 rounded-md font-medium disabled:opacity-50"
        >
          {submitting ? 'Activando cuenta…' : 'Confirmar y activar mi cuenta'}
        </button>
      </div>
    </section>
  );
}
