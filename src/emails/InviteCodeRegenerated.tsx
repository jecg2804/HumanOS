import { Heading, Text, Button, Section } from '@react-email/components';
import { BaseLayout } from './BaseLayout';

interface Props {
  employee_name: string;
  code: string;
  onboarding_url: string;
  expires_at: string;
}

export function InviteCodeRegenerated({ employee_name, code, onboarding_url, expires_at }: Props) {
  return (
    <BaseLayout preview="Tu nuevo código de invitación está listo">
      <Heading className="text-xl font-bold text-gray-900">
        Código renovado, {employee_name}
      </Heading>
      <Text className="text-base text-gray-700 mt-4">
        Recursos Humanos ha generado un nuevo código para ti. El código anterior ya no es válido.
      </Text>
      <Section className="bg-gray-100 rounded p-6 my-6 text-center">
        <Text className="text-sm text-gray-600 mb-1">Tu nuevo código:</Text>
        <Text className="text-3xl font-mono font-bold tracking-widest text-[#1B3A5C]">
          {code}
        </Text>
      </Section>
      <Button
        href={onboarding_url}
        className="bg-[#1B3A5C] text-white px-6 py-3 rounded-md font-medium inline-block"
      >
        Continuar
      </Button>
      <Text className="text-sm text-gray-600 mt-6">
        El nuevo código vence el {expires_at}.
      </Text>
    </BaseLayout>
  );
}

export default InviteCodeRegenerated;
