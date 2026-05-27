import { Heading, Text, Button, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  perfil_url: string;
}

export function WelcomeEmployee({ employee_name, perfil_url }: Props) {
  return (
    <BaseLayout preview="Tu cuenta HumanOS está activa">
      <Heading className="text-xl font-bold text-gray-900">
        Bienvenido a HumanOS, {employee_name}
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        Tu cuenta está configurada y lista para usar. Desde HumanOS puedes:
      </Text>
      <Section className="my-4">
        <Text className="text-sm text-gray-700">• Solicitar vacaciones, préstamos, permisos</Text>
        <Text className="text-sm text-gray-700">• Ver el estado de tus trámites</Text>
        <Text className="text-sm text-gray-700">• Actualizar tu información personal</Text>
        <Text className="text-sm text-gray-700">• Consultar políticas y procedimientos</Text>
      </Section>
      <Button
        href={perfil_url}
        className="bg-[#1B3A5C] text-white px-6 py-3 rounded-md font-medium inline-block"
      >
        Ver mi perfil
      </Button>
    </BaseLayout>
  );
}

export default WelcomeEmployee;
