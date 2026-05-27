import { Heading, Text, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  severity: 'leve' | 'critica';
  description: string;
  reported_at: string;
}

export function OnboardingErrorReported({
  employee_name,
  severity,
  description,
  reported_at,
}: Props) {
  return (
    <BaseLayout preview={`${employee_name} reporta un error en sus datos de onboarding`}>
      <Heading className="text-xl font-bold text-gray-900">
        Empleado reporta error en sus datos
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        <strong>{employee_name}</strong> reportó un error mientras completaba su onboarding.
      </Text>
      <Section className="bg-gray-100 rounded p-4 my-4">
        <Text className="text-sm">
          <strong>Severidad:</strong>{' '}
          {severity === 'critica' ? 'Crítica (wizard pausado)' : 'Leve (wizard continúa)'}
        </Text>
        <Text className="text-sm">
          <strong>Reportado:</strong> {reported_at}
        </Text>
        <Text className="text-sm">
          <strong>Descripción:</strong>
        </Text>
        <Text className="text-sm whitespace-pre-wrap">{description}</Text>
      </Section>
      <Text className="text-sm text-gray-700">
        Revisa el empleado en /admin/empleados (filtra por &quot;Necesitan revisión&quot;) y
        corrige antes de notificarle.
      </Text>
    </BaseLayout>
  );
}

export default OnboardingErrorReported;
