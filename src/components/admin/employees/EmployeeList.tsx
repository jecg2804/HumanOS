'use client';
import { useState } from 'react';
import Link from 'next/link';

export interface EmployeeListItem {
  id: string;
  full_name: string;
  national_id: string | null;
  employee_code: string | null;
  needs_review: boolean;
  review_notes: string | null;
  position: string | null;
  department: string | null;
}

interface Props {
  employees: EmployeeListItem[];
}

export function EmployeeList({ employees }: Props) {
  const [filter, setFilter] = useState<'all' | 'needs_review'>('all');
  const needsReviewCount = employees.filter((e) => e.needs_review).length;
  const visible =
    filter === 'needs_review' ? employees.filter((e) => e.needs_review) : employees;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'all' ? 'bg-navy-500 text-white' : 'bg-gray-200'
          }`}
        >
          Todos ({employees.length})
        </button>
        <button
          onClick={() => setFilter('needs_review')}
          aria-pressed={filter === 'needs_review'}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'needs_review' ? 'bg-warning-500 text-white' : 'bg-gray-200'
          }`}
        >
          Necesitan revisión{' '}
          {needsReviewCount > 0 && (
            <span className="ml-1 bg-white text-warning-500 rounded-full px-2">
              {needsReviewCount}
            </span>
          )}
        </button>
        <div className="flex-1" />
        <Link
          href="/admin/empleados/nuevo"
          className="bg-success-500 text-white px-4 py-2 rounded font-medium"
        >
          Nuevo empleado
        </Link>
      </div>
      <table className="w-full bg-white border rounded">
        <caption className="sr-only">Lista de empleados de ICONSA</caption>
        <thead className="bg-gray-50 border-b">
          <tr>
            <th scope="col" className="text-left p-3 text-sm">Nombre</th>
            <th scope="col" className="text-left p-3 text-sm">Cédula</th>
            <th scope="col" className="text-left p-3 text-sm">Cargo</th>
            <th scope="col" className="text-left p-3 text-sm">Departamento</th>
            <th scope="col" className="text-left p-3 text-sm">Estado</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="p-3">{e.full_name}</td>
              <td className="p-3 text-sm">{e.national_id ?? '—'}</td>
              <td className="p-3 text-sm">{e.position ?? '—'}</td>
              <td className="p-3 text-sm">{e.department ?? '—'}</td>
              <td className="p-3 text-sm">
                {e.needs_review && (
                  <span className="bg-warning-500 text-white px-2 py-0.5 rounded text-xs">
                    Revisión
                  </span>
                )}
              </td>
              <td className="p-3">
                <Link
                  href={`/admin/empleados/${e.id}/editar`}
                  className="text-info-500 underline text-sm"
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
