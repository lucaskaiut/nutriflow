import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { accountApi } from '@/api/endpoints';

/** Exporta todos os dados pessoais (JSON estruturado) e abre o compartilhamento do sistema. */
export async function exportMyData(): Promise<void> {
  const { data } = await accountApi.export();
  const json = JSON.stringify(data, null, 2);
  const name = `nutriflow-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento não está disponível neste aparelho.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exportar meus dados' });
}
