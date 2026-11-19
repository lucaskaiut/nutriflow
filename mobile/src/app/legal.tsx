import { View } from 'react-native';

import { Card, Screen, StackHeader, Text } from '@/components/ui';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Sobre o NutriFlow',
    body: [
      'O NutriFlow é uma ferramenta pessoal de registro e acompanhamento alimentar, de peso, hidratação e medidas corporais.',
      'As metas e estimativas exibidas são calculadas por fórmulas de referência (ex.: Mifflin-St Jeor) e têm caráter informativo. Elas não constituem prescrição médica ou nutricional e não substituem o acompanhamento de profissionais de saúde.',
    ],
  },
  {
    title: '2. Dados tratados',
    body: [
      'Dados de cadastro: nome, e-mail e senha (armazenada apenas como hash criptográfico).',
      'Dados pessoais sensíveis de saúde (LGPD, art. 5º, II): data de nascimento, sexo, altura, peso, medidas corporais, refeições, consumo de água e metas.',
      'Valores nutricionais de referência vêm da Tabela Brasileira de Composição de Alimentos (TACO, 4ª ed., NEPA/UNICAMP).',
    ],
  },
  {
    title: '3. Finalidade e base legal',
    body: [
      'Os dados são tratados exclusivamente para prestar as funcionalidades do app à própria pessoa titular, com base no seu consentimento específico e destacado (LGPD, art. 11, I), registrado no aceite destes termos.',
      'Não vendemos, não compartilhamos para publicidade e não usamos seus dados para treinar modelos de inteligência artificial.',
    ],
  },
  {
    title: '4. Segurança e acesso',
    body: [
      'Cada conta acessa exclusivamente os próprios registros. A comunicação com o servidor deve ocorrer por conexão criptografada (HTTPS) e o token de sessão fica no armazenamento seguro do aparelho.',
      'Lembretes são notificações locais agendadas no próprio aparelho.',
    ],
  },
  {
    title: '5. Seus direitos',
    body: [
      'Você pode, a qualquer momento, consultar e corrigir seus dados no app, exportar todos eles em formato estruturado (Configurações → Privacidade → Exportar meus dados) e excluir definitivamente sua conta e todos os dados associados (Configurações → Privacidade → Excluir minha conta).',
      'A exclusão é imediata e irreversível; cópias de segurança são sobrescritas conforme a política de retenção do servidor.',
    ],
  },
  {
    title: '6. Contato',
    body: ['Dúvidas sobre privacidade podem ser enviadas ao encarregado (DPO) indicado pelo controlador responsável pela publicação do app.'],
  },
];

export default function LegalScreen() {
  return (
    <Screen header={<StackHeader title="Termos e Privacidade" />}>
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <Text variant="subheading" style={{ marginBottom: 8 }}>{s.title}</Text>
          <View style={{ gap: 8 }}>
            {s.body.map((p, i) => <Text key={i} variant="caption" tone="muted" style={{ lineHeight: 18 }}>{p}</Text>)}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
