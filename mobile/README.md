# NutriFlow — app (Expo SDK 58)

Instalação, variáveis de ambiente e execução: veja o [README da raiz](../README.md).
Arquitetura e decisões: [docs/arquitetura.md](../docs/arquitetura.md).

```bash
cp .env.example .env
npm install
npx expo start            # Expo Go / emulador / web
npx tsc --noEmit          # tipos
npx expo lint             # lint
```

Estrutura: `src/app` (rotas Expo Router), `src/components` (UI portada do protótipo),
`src/features/queries.ts` (TanStack Query), `src/api` (cliente HTTP), `src/stores`, `src/lib`, `src/theme`.
