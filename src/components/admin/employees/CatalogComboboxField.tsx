'use client';
import { useState } from 'react';

interface Option {
  id: string;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selectedId: string;
  freeText: string;
  onSelectId: (id: string) => void;
  onFreeText: (text: string) => void;
}

export function CatalogComboboxField({
  label,
  options,
  selectedId,
  freeText,
  onSelectId,
  onFreeText,
}: Props) {
  const [useFreeText, setUseFreeText] = useState(!!freeText && !selectedId);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {useFreeText ? (
        <>
          <input
            type="text"
            value={freeText}
            onChange={(e) => onFreeText(e.target.value)}
            placeholder="Ingresa el valor"
            className="w-full p-3 border rounded"
          />
          <button
            type="button"
            onClick={() => {
              setUseFreeText(false);
              onFreeText('');
            }}
            className="text-sm text-[#0A6EBD] underline mt-1"
          >
            ← Volver al catálogo
          </button>
        </>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => onSelectId(e.target.value)}
            className="w-full p-3 border rounded"
          >
            <option value="">Selecciona…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setUseFreeText(true);
              onSelectId('');
            }}
            className="text-sm text-[#0A6EBD] underline mt-1"
          >
            No veo el mío — usar texto libre
          </button>
        </>
      )}
    </div>
  );
}
