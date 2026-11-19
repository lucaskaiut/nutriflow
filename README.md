# NutriFlow — controle nutricional (MVP)

App mobile de controle nutricional: diário alimentar, receitas com cálculo por porção, refeições
salvas, peso, medidas, água, metas e relatórios.

```
nox-health/
├── api/         API Laravel 13 (derivada do nox-skeleton) — regras de negócio, cálculos, dados
├── mobile/      App Expo SDK 58 / React Native (iOS, Android e web)
├── docker/      Ambiente de desenvolvimento (PHP-FPM, Nginx, MySQL, Mailpit) + backup
├── docs/        Arquitetura, modelagem e decisões (docs/arquitetura.md)
└── prototype/   Protótipo visual de referência (somente local, fora do repositório)
```

- **API:** Laravel 13, PHP 8.4, Sanctum (tokens Bearer), MySQL 8.4, `brick/math` (cálculos decimais exatos).
- **App:** Expo SDK 58, Expo Router, TanStack Query, Zustand, React Hook Form + Zod, react-native-svg.
- **Base de alimentos:** TACO 4ª ed. (NEPA/UNICAMP), com 597 alimentos e fonte documentada em `api/database/data/taco/README.md`.

Detalhes de arquitetura, modelagem, regras de cálculo, segurança/LGPD e backup estão em
**[docs/arquitetura.md](docs/arquitetura.md)**.

---

## Requisitos

| Ferramenta | Versão |
|---|---|
| Docker + Docker Compose | 24+ / v2+ |
| Node.js + npm | 20.19+ (testado com 24) |
| App no aparelho | [Expo Go](https://expo.dev/go) para testes rápidos, ou development build |

PHP e Composer **não** precisam estar no host: rodam no container `api`.

## Execução local

### 1. API

```bash
docker compose -p nutriflow up -d --build mysql api nginx mailpit
```

Na primeira subida, o container cria `api/.env` a partir de `api/.env.docker`, instala as
dependências, gera a `APP_KEY`, roda as migrations e os seeders (categorias, TACO e uma conta
demo em `APP_ENV=local`). Acompanhe com `docker compose -p nutriflow logs -f api`.

| Serviço | URL |
|---|---|
| API | http://localhost:8090/api |
| Mailpit (e-mails de recuperação de senha) | http://localhost:8026 |
| MySQL (host) | `localhost:3317` (usuário `nutriflow` / senha `secret`) |

Conta demo (somente local): `demo@nutriflow.localhost` / `password`.

### 2. App

```bash
cd mobile
cp .env.example .env        # ajuste EXPO_PUBLIC_API_URL (ver abaixo)
npm install
npx expo start              # QR code para o Expo Go; "a" Android, "i" iOS, "w" web
```

`EXPO_PUBLIC_API_URL` precisa ser acessível **a partir do aparelho**:

| Onde o app roda | Valor |
|---|---|
| Navegador (web) / simulador iOS | `http://localhost:8090/api` |
| Emulador Android | `http://10.0.2.2:8090/api` |
| Aparelho físico | `http://<IP-da-sua-máquina>:8090/api` |

> Lembretes (notificações locais) e o seletor de fotos funcionam no Expo Go. Para o login com
> Google em aparelho físico é recomendado um *development build* (`npx expo run:android|ios`).

## Migrations, seeders e testes

```bash
# migrations (incrementais)
docker compose -p nutriflow exec api php artisan migrate

# recriar o banco do zero + seeders (APAGA os dados locais)
docker compose -p nutriflow exec api php artisan migrate:fresh --seed

# reimportar só a base TACO (idempotente)
docker compose -p nutriflow exec api php artisan db:seed --class=Database\\Seeders\\FoodCategorySeeder
docker compose -p nutriflow exec api php artisan db:seed --class=Database\\Seeders\\TacoFoodSeeder

# testes automatizados da API (SQLite em memória; não tocam no banco local)
docker compose -p nutriflow exec api php artisan test

# app: tipos e lint
cd mobile && npx tsc --noEmit && npx expo lint
```

Principais suítes (`api/tests`):

| Suíte | Cobre |
|---|---|
| `Feature/Nutrition/RecipeNutritionTest` | soma dos ingredientes, valor por porção, ½ porção, múltiplas porções, alteração de rendimento, snapshot histórico, medidas caseiras, unidades |
| `Feature/Diary/DiaryTest` | soma de calorias/macros, edição de quantidade, exclusão de item, separação por data, fuso horário, duplicação, refeição salva → diário |
| `Feature/Tracking/WeightTest` | registro, edição, exclusão, ordem cronológica, peso atual, evolução e filtros de período |
| `Feature/Tracking/WaterAndReportsTest` | água, dashboard e relatórios a partir de dados reais |
| `Feature/Security/UserIsolationTest` | isolamento entre usuários, rotas protegidas, posse de ids enviados pelo app, token revogado |
| `Feature/Account/AccountTest` | cadastro, onboarding/estimativas, metas, recuperação de senha, exclusão da conta, preferências |
| `Feature/Auth/*` | login, cadastro e login com Google |
| `Unit/Nutrition/NutrientsTest` | aritmética decimal exata e estimativa energética |

## Variáveis de ambiente

### API (`api/.env`, modelo em `api/.env.docker` / `api/.env.example`)

| Variável | Uso | Padrão local |
|---|---|---|
| `APP_ENV` / `APP_DEBUG` | ambiente; **`APP_DEBUG=false` em produção** | `local` / `true` |
| `APP_KEY` | chave de criptografia (gerada no start) | — |
| `APP_URL` | URL pública da API | `http://localhost` |
| `APP_LOCALE` | idioma das mensagens | `pt_BR` |
| `DB_*` | conexão MySQL | `mysql` / `nutriflow` / `nutriflow` / `secret` |
| `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` | envio do código de recuperação de senha | Mailpit (`smtp`, `mailpit:1025`) |
| `FRONTEND_URL` | origem permitida no CORS (app web) | `http://localhost:8081` |
| `GOOGLE_CLIENT_IDS` | Client IDs OAuth aceitos como `aud` do ID token (web, iOS, Android), separados por vírgula. Vazio = login com Google desligado | vazio |
| `BCRYPT_ROUNDS` | custo do hash de senha | `12` |
| `ASSISTANT_ENABLED` | assistente de IA herdado do skeleton (fora do escopo) | `false` |

Variáveis do Compose (arquivo `.env` na raiz, opcional): `NGINX_PORT` (8090), `DB_FORWARD_PORT` (3317),
`MAILPIT_UI_PORT` (8026), `DB_ROOT_PASSWORD`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

### App (`mobile/.env`)

| Variável | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL da API (**https em produção**) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `_IOS_` / `_ANDROID_` | Client IDs OAuth públicos do Google (opcionais) |

Variáveis `EXPO_PUBLIC_*` são embutidas no app e por isso **nunca** devem conter segredos. O app
não guarda credenciais; apenas o token de sessão da pessoa, no SecureStore (Keychain/Keystore).

### Login com Google (opcional)

1. No Google Cloud Console, crie Client IDs OAuth do tipo *Web*, *iOS* (bundle `br.com.nox.nutriflow`)
   e *Android* (pacote `br.com.nox.nutriflow` + SHA-1 do certificado).
2. Coloque os três IDs em `GOOGLE_CLIENT_IDS` (API) e nas variáveis `EXPO_PUBLIC_GOOGLE_*` (app).
3. Com qualquer um deles vazio na API, o botão "Continuar com Google" não é exibido.

## Backup

```bash
./docker/backup/backup.sh                                   # backups/nutriflow-AAAAMMDD-HHMMSS.sql.gz
BACKUP_DIR=/mnt/seguro RETENTION_DAYS=14 ./docker/backup/backup.sh
```

Política recomendada (detalhes em `docs/arquitetura.md`): diário, retenção de 14 dias, volume
criptografado e cópia externa com acesso restrito.

## Funcionalidades do MVP

- **Conta:** cadastro (nome, e-mail, senha + confirmação, aceite dos termos), login, login com Google,
  recuperação de senha por código enviado por e-mail, logout com revogação do token.
- **Perfil e onboarding:** dados corporais, objetivo e nível de atividade, com metas iniciais estimadas.
- **Dashboard:** peso (inicial, atual, desejado, variação), calorias e macros do dia vs. metas,
  refeições do dia, água e mini-gráfico, tudo no **dia local** da pessoa.
- **Diário:** refeições por tipo (incluindo personalizada), alimentos e receitas, edição de quantidade,
  exclusão, duplicação para outro dia, navegação por datas (passado e planejamento futuro).
- **Alimentos:** busca na TACO e nos alimentos próprios, categorias, favoritos, recentes,
  alimentos personalizados e medidas caseiras.
- **Receitas:** ingredientes da base, unidades (g/kg/ml/L/un/medida), rendimento em porções e peso,
  valor total e por porção, consumo fracionado (ex.: 1,5 porção), favoritar, duplicar, arquivar,
  excluir, foto, histórico de uso e snapshot histórico.
- **Refeições salvas:** combinações de alimentos/receitas, favoritar, duplicar e adicionar ao diário.
- **Peso, água e medidas:** registro, edição, exclusão, histórico e gráficos (7d, 30d, 3m, 6m, 1 ano e todo o período).
- **Metas:** manuais ou estimadas (Mifflin-St Jeor), marcadas como estimativa e não como prescrição.
- **Relatórios:** evolução do peso, médias de calorias e macros, consistência e progresso das metas.
- **Preferências:** tema claro, escuro ou do sistema; kg ou lb e cm ou in (só na exibição); lembretes locais.
- **Privacidade (LGPD):** exportação de todos os dados (JSON) e exclusão definitiva da conta.

## Limitações conhecidas

Ver a seção "Limitações conhecidas" em [docs/arquitetura.md](docs/arquitetura.md#limitações-conhecidas).
