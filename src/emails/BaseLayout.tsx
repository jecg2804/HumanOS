import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Tailwind,
  Preview,
  pixelBasedPreset,
} from '@react-email/components';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-xl bg-white p-8 my-8 rounded-lg">
            <Section>
              <Text className="text-2xl font-bold text-[#1B3A5C] mb-2">HumanOS</Text>
              <Text className="text-sm text-gray-500 mt-0">ICONSA — Recursos Humanos</Text>
            </Section>
            <Section className="mt-6">{children}</Section>
            <Section className="mt-8 border-t border-gray-200 pt-4">
              <Text className="text-xs text-gray-500">
                Este es un mensaje automático de HumanOS. Si no esperabas recibirlo, contacta a
                Recursos Humanos.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
