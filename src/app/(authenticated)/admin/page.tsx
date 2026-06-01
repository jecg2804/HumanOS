import { redirect } from 'next/navigation';

// FE-2: /admin had no index page (broken nav link -> 404). The admin area's
// landing surface is the employee directory. (admin/layout.tsx enforces
// requireHrAdmin before this runs.)
export default function AdminIndex() {
  redirect('/admin/empleados');
}
