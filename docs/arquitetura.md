# NutriFlow — arquitetura, modelagem e decisões

## 1. Visão geral

```
 App Expo (iOS / Android / web)                    API Laravel (Docker)
 ┌──────────────────────────────┐   HTTPS + Bearer  ┌───────────────────────────────────┐
 │ telas (src/app, Expo Router) │ ───────────────▶ │ routes/api.php                    │
 │ componentes (src/components) │                  │  └ Controllers (finos)            │
 │ hooks TanStack Query         │ ◀─────────────── │      └ FormRequests (validação)   │
 │ api/ (cliente HTTP, tipos)   │   JSON (pt-BR)   │      └ Policies (dono do registro)│
 │ stores (sessão, toast, fluxo)│                  │      └ Services (regras)          │
 │ lib/ (formatação, prévias)   │                  │          └ NutritionCalculator    │
 └──────────────────────────────┘                  │          └ Models (Eloquent)      │
                                                    └───────────────┬───────────────────┘
                                                                    ▼  MySQL 8.4
```

O app não acessa banco nem guarda credenciais; toda regra de negócio e todo cálculo persistido
acontecem na API. O app só formata e mostra **prévias** enquanto a pessoa digita (seção 4.4).

## 2. Decisões principais

| Decisão | Motivo |
|---|---|
| API derivada do **nox-skeleton**, como no glicemia | Reaproveita autenticação Sanctum, Docker, tratamento de erros JSON, módulos e testes já usados nos outros projetos. Cada conta é um tenant pessoal; billing, contas filhas, papéis, tokens de API, webhooks e o assistente de IA **não são expostos**. |
| App em **Expo / React Native** | Escolha do responsável. O protótipo (React + Tailwind web) foi portado tela a tela para componentes nativos; a estrutura e os fluxos seguem o protótipo, mas a identidade visual foi revista (ver "Identidade visual"). |
| Estilo com `StyleSheet` + tokens (`src/theme/tokens.ts`), sem Tailwind no nativo | A documentação do Expo SDK 58 não oferece caminho oficial para Tailwind em iOS/Android, e o NativeWind estável exige Tailwind 3. Cores, raios e tipografia ficaram centralizados, o que também viabilizou o tema escuro. |
| Isolamento por `user_id` + policies "dono" que respondem **404** | Dado de saúde é pessoal. Registros de outra pessoa nem "existem" para a API. A autorização roda **antes** da validação (`AuthorizesRouteModel`). |
| **Snapshot** nutricional em `meal_items` | Integridade histórica: editar alimento, receita ou refeição salva nunca altera o diário. Mudar a quantidade reescala o próprio snapshot. |
| Receitas e refeições salvas **sem** totais armazenados | Os valores são sempre derivados dos ingredientes e itens atuais, sem duplicação nem risco de ficarem desatualizados. |
| `DECIMAL` no banco + `brick/math` (BigDecimal) nos cálculos | Nada de ponto flutuante binário em cálculos nutricionais. O arredondamento acontece só na borda (API → 1 casa). |
| Datas do diário/água/peso em **data e hora locais** + fuso no perfil | "Hoje" é o dia do calendário de quem come. O servidor calcula "hoje" com `profiles.timezone` (`UserClock`), nunca em UTC. |
| Metas versionadas (`nutrition_goals.effective_from`) | Relatórios de períodos passados usam a meta vigente na época. |
| Base TACO importada por seeder idempotente | Fonte pública e citável, sem inventar valores: campos ausentes ficam `NULL` e aparecem como "—". |
| Recuperação de senha por **código de 6 dígitos** | Funciona bem no celular (sem depender de deep link). O código fica só como hash, expira em 30 min, é de uso único e tem tentativas limitadas. A resposta não revela se o e-mail existe. |
| Lembretes como **notificações locais** | Nenhum dado de saúde passa por servidor de push. |
| Unidades lb/in apenas na exibição | O servidor guarda sempre kg e cm, sem conversões acumuladas. |

## 3. Módulos

### API (`api/app/Modules`)

| Módulo | Responsabilidade |
|---|---|
| `Nutrition` | Núcleo de cálculo: `Nutrients` (valor decimal imutável), `NutritionCalculator`, `QuantityConverter`, `ItemResolver` (valida posse e converte unidades), enums de unidade |
| `Account` | Perfil, preferências, onboarding, `UserClock` (dia local), exportação e exclusão (LGPD), recuperação de senha |
| `Food` | Categorias, alimentos (TACO + personalizados), nutrientes extras, medidas caseiras, favoritos, recentes |
| `Recipe` | Receitas, ingredientes, foto privada, arquivamento, histórico de uso |
| `SavedMeal` | Refeições salvas e envio ao diário |
| `Diary` | Refeições e itens (snapshot), duplicação, edição de quantidade |
| `Goal` | Metas versionadas e `EnergyEstimator` |
| `Tracking` | Peso, água e medidas corporais, com filtros de período |
| `Report` | Dashboard do dia e relatórios do período |
| `Auth`, `Tenant`, `User`, `ACL`… | Herdados do skeleton (contas pessoais e login com Google, adaptados do glicemia) |

### App (`mobile/src`)

| Pasta | Conteúdo |
|---|---|
| `app/` | Rotas (Expo Router). Guards: deslogado → `(auth)`; sem onboarding → `onboarding`; logado → `(tabs)` e telas empilhadas |
| `components/ui` | Kit de interface: Button, Card, Input, DateInput, ProgressBar/MacroBar, Sheet/Dialog, Toast, EmptyState, Skeleton, Stepper, Segmented, ChipRow, OptionTile, MenuRow, gráficos SVG |
| `components/*` | Componentes de domínio: AddMealSheet, EditItemSheet, MealTargetSheet, FoodRow, NutritionPanel, RecipeImage, WeightDialog, DraftItemRow |
| `features/queries.ts` | Chaves e hooks do TanStack Query, além de `useApiMutation` (toast só após confirmação da API + invalidação das telas afetadas) |
| `api/` | Cliente HTTP (tratamento de 401/422/429/500/sem rede), endpoints e tipos |
| `stores/` | Sessão (SecureStore), toast e o "fluxo de escolha" (para onde vai um alimento ou receita escolhido) |
| `lib/` | Formatação pt-BR e unidades, datas locais, prévias nutricionais, lembretes, exportação |

## 4. Regras de cálculo

### 4.1 Alimento
`nutriente = valor_de_referência × quantidade_na_unidade_de_referência ÷ quantidade_de_referência`

Conversões (`QuantityConverter`): g←kg (×1000), ml←L (×1000), un, e **medida caseira** (`food_portions.amount`
na unidade de referência). Unidades incompatíveis (ex.: gramas para um alimento em ml) são recusadas,
porque não há densidade confiável para converter.

### 4.2 Receita
- Total = Σ ingredientes (4.1).
- Por porção = total ÷ `servings`. Mudar o rendimento recalcula a porção.
- `yield_weight_g` (opcional) serve só para mostrar o peso aproximado de cada porção.
- Exemplo do escopo (coberto em teste): receita inteira de 2.100 kcal com 5 porções dá 420 kcal por porção; 1,5 porção registra 630 kcal.

### 4.3 Diário (snapshot)
Ao registrar, o `meal_item` guarda `basis_*` (nutrientes por `basis_amount`: 100 g do alimento ou 1 porção da receita)
e os totais. Alterar a quantidade reescala `basis_*`. Nutriente desconhecido (`NULL`) é preservado no
item e conta como 0 nas somas (o total mostra o que se sabe).

### 4.4 Prévias no app
Enquanto a pessoa digita, o app aplica a mesma fórmula linear a valores **vindos da API** (nutrientes
por referência ou por porção) só para feedback imediato. O que é gravado é sempre calculado pelo
servidor, que é a única fonte de verdade.

### 4.5 Estimativa energética (`EnergyEstimator`)
TMB pela fórmula de Mifflin-St Jeor, multiplicada pelo fator de atividade (1,2 a 1,9) para obter o gasto total.
Meta: emagrecimento = gasto total − 500 kcal; manutenção = gasto total; ganho de peso ou massa = gasto total + 10%.
Proteína de 1,6 a 2,0 g por kg do **peso meta** (ou do peso atual, quando não há meta), gordura em 25% das kcal,
carboidratos com o restante e água a 35 ml por kg do peso atual.
O resultado é sempre exibido como **estimativa** com aviso de que não substitui um profissional,
e pode ser ajustado manualmente.

### 4.6 Relatórios
Médias nutricionais consideram **apenas dias com alimentação registrada**. "Dias na meta" =
kcal ≤ meta do dia. Para dias anteriores à primeira meta, vale a primeira meta definida.

## 5. Modelagem de dados

Todas as tabelas de domínio têm `user_id → users` com `ON DELETE CASCADE` (a exclusão da conta apaga tudo)
e `uuid` público. O `id` numérico nunca sai da API.

| Tabela | Campos principais | Observações |
|---|---|---|
| `profiles` | birth_date, sex, height_cm (5,1), initial/target_weight_kg (5,2), activity_level, goal, timezone, onboarded_at | 1:1 com users |
| `user_preferences` | theme, weight_unit, length_unit, meal/water/weight reminders | 1:1 |
| `food_categories` | slug, name, position | 15 da TACO + "Outros" |
| `foods` | user_id (NULL = referência), source, source_ref, name, reference_amount/unit, kcal, protein_g, carbs_g, fat_g, fiber_g (10,3) | soft delete; único (source, source_ref) |
| `food_nutrients` | food_id, nutrient, amount (12,4), unit | sódio, colesterol, minerais, vitamina C… |
| `food_portions` | food_id, user_id, label, amount | medidas caseiras (próprias) |
| `food_favorites` | user_id, food_id | único por par |
| `recipes` | name, description, photo_path, servings (8,2), yield_weight_g, prep_time_minutes, instructions, is_favorite, archived_at | soft delete |
| `recipe_ingredients` | recipe_id, food_id, food_portion_id, quantity, unit, base_quantity, position | |
| `saved_meals` / `saved_meal_items` | kind (food/recipe), food_id/recipe_id, quantity, unit, base_quantity | |
| `meals` | date, time (locais), type, custom_name, notes | índice (user_id, date) |
| `meal_items` | kind, food_id/recipe_id (nullOnDelete), name, quantity, unit, base_quantity, basis_*, kcal…fiber_g | snapshot |
| `nutrition_goals` | effective_from, kcal, protein/carbs/fat_g, water_ml, mode | único (user_id, effective_from) |
| `weight_entries` | measured_on, measured_at, weight_kg (5,2), notes | vários por dia permitidos |
| `body_measurements` | type, value (6,2), unit, measured_on, notes | |
| `water_entries` | date, time, amount_ml | |

### Política de exclusão e arquivamento
- **Alimento personalizado / receita:** soft delete (somem da busca e da lista). Receitas e refeições salvas que já os usam continuam válidas, e o diário fica intacto (snapshot).
- **Receita:** também pode ser **arquivada** (some da lista principal e pode ser restaurada).
- **Refeição do diário, item, pesagem, água, medida, refeição salva, medida caseira:** exclusão física, após confirmação no app.
- **Conta:** exclusão física imediata de tudo (cascata a partir do tenant e do usuário), tokens, código de senha e fotos.

## 6. Segurança e privacidade (LGPD)

- Senhas com bcrypt (cast `hashed`). Tokens Sanctum guardados como hash no servidor e, no app, apenas no SecureStore.
- Todas as rotas de domínio exigem `auth:sanctum`. Policies "dono" com **404** para registros alheios; ids recebidos (alimento, receita, medida caseira) passam pelo `ItemResolver`, que verifica a posse; `user_id` enviado pelo cliente é ignorado.
- Validação no backend (FormRequests e mensagens em pt-BR), além da validação no app.
- Limites de taxa: `auth` (10/min por IP) em login, cadastro e senha; `app` (180/min por usuário); `sensitive` (5/min) para exportar e excluir a conta. O código de recuperação tem no máximo 5 tentativas por código.
- Foto de receita em disco **privado**, servida por rota autenticada.
- Logs: nenhum dado de saúde é registrado; a exclusão de conta loga apenas o id interno. **Em produção:** `APP_DEBUG=false`, HTTPS obrigatório e `FRONTEND_URL` restrito.
- Direitos do titular: exportação completa (JSON) e exclusão definitiva, no app (Configurações → Privacidade).
- Consentimento: aceite explícito dos termos, incluindo dados de saúde, no cadastro e no primeiro login com Google. Termos e política ficam no app (`/legal`).
- Dependências: `composer audit` sem pendências após a atualização. O `npm audit` aponta 3 alertas moderados em `minimatch`, dependência de ferramentas de build do Expo e não do app distribuído.

### Backup
Script `docker/backup/backup.sh`: `mysqldump --single-transaction` comprimido, permissões 600/700, teste de
integridade e **retenção de 14 dias** (configurável). Recomendação para produção:
1. cron diário fora do horário de pico;
2. diretório em volume criptografado e cópia externa (bucket com criptografia e acesso restrito);
3. teste de restauração mensal (`gunzip -c arquivo.sql.gz | mysql …`);
4. retenção curta: contas excluídas deixam de existir nos backups após o prazo de retenção, o que deve constar na política de privacidade.

## 7. API — principais rotas (`/api`)

| Área | Rotas |
|---|---|
| Auth | `POST auth/register`, `auth/login`, `auth/google`, `auth/logout`, `auth/password/forgot`, `auth/password/reset`; `GET auth/providers` |
| Conta | `GET/PATCH me`, `POST me/onboarding`, `PATCH me/preferences`, `GET me/export`, `DELETE me` |
| Dashboard/relatórios | `GET dashboard?date=`, `GET reports?period=7d\|30d\|3m\|6m\|1y\|all` |
| Metas | `GET/PUT goals` |
| Alimentos | `GET foods?q=&category=&scope=`, `GET foods/recent`, `GET food-categories`, `POST/GET/PATCH/DELETE foods/{id}`, `POST/DELETE foods/{id}/favorite`, `POST foods/{id}/portions`, `DELETE food-portions/{id}` |
| Receitas | CRUD `recipes`, `POST recipes/{id}/duplicate`, `PUT …/archive`, `PUT …/favorite`, `GET …/usage`, `GET/POST/DELETE …/photo` |
| Refeições salvas | CRUD `saved-meals`, `POST …/duplicate`, `PUT …/favorite`, `POST …/add-to-diary` |
| Diário | `GET diary?date=`, CRUD `meals`, `POST meals/{id}/duplicate`, `POST meals/{id}/items`, `PATCH/DELETE meal-items/{id}` |
| Peso / água / medidas | `weights?period=`, `water?date=`, `water/history?days=`, `measurements?type=` (CRUD) |

Respostas seguem o padrão do skeleton: `{ success, message, data, meta? }`; erros de validação → 422 com `errors`.

## 8. Limitações conhecidas

- **Base de alimentos:** a TACO tem 597 alimentos crus/preparados, sem marcas, sem açúcares e sem gordura saturada, e alguns valores ausentes (ex.: fibra em 235 itens), que aparecem como "—". Não há medidas caseiras de referência (a TACO não as publica): cada pessoa cadastra as suas. Bebidas na TACO são expressas por 100 g.
- **Conversões de unidade:** não há conversão entre massa e volume (exige densidade). Por isso, um alimento em g aceita g, kg e medidas caseiras, mas não ml.
- **Fuso horário:** o app envia o fuso do aparelho no onboarding e ao editar o perfil. Quem viaja precisa salvar o perfil para atualizar "hoje".
- **Offline:** o app exige conexão; não há fila de sincronização offline.
- **Fotos de receita:** ficam no disco local do servidor (`storage/app/private`). Para vários servidores ou alta disponibilidade, configure um disco S3 privado.
- **Google login:** exige configurar os Client IDs (ver README). Em Expo Go o fluxo pode ser limitado; prefira um development build.
- **Termos e política** (`/legal`) são um texto-base: revisar com o jurídico e indicar o controlador e o encarregado (DPO) antes de publicar.
- **Herança do skeleton:** os módulos Billing, ACL e Webhook continuam no código (não expostos), para facilitar a sincronização com o template.
- **Testes do app:** a cobertura automatizada está na API (97 testes). O app foi validado com typecheck, lint, bundle Android/web e um roteiro E2E manual automatizado no navegador (cadastro → onboarding → diário → receita → peso → água → medidas). Não há suíte de testes de UI versionada no repositório.

## 9. Identidade visual

A identidade passou por duas revisões a pedido do responsável:

1. **Remoção dos padrões de interface gerada por IA** que vinham do protótipo: violeta/índigo,
   emojis como ícones, símbolo de "brilhos", gradientes e sombras com brilho, rótulos em caixa
   alta, subtítulos que repetiam o título e textos de marketing.
2. **Linguagem "pastel suave"**, a partir de referências escolhidas pelo responsável (apps de
   saúde e de contagem de calorias):
   - fundo cinza-azulado claro, cartões brancos sem borda e cantos bem arredondados (20–28 px);
   - blocos pastel por assunto, definidos em `tintMint`, `tintSky`, `tintLilac`, `tintLavender` e `tintButter`
     (`src/theme/tokens.ts`): calorias em menta, água em azul-céu, peso em lavanda; cada período de refeição tem
     seu tom (`MEAL_TINT` em `lib/labels.ts`);
   - verde-petróleo escuro (`#0F4C5C`) para ações e seleção, amarelo-manteiga para a aba ativa;
   - botões e filtros em pílula, ícones em círculos, barra inferior flutuante;
   - números grandes em Outfit Medium; textos em Plus Jakarta Sans;
   - componentes visuais em `components/ui/Visuals.tsx`: `RingGauge` (anel de progresso), `PillBars`
     (barras verticais com o valor em bolha) e `WeekStrip` (seletor semanal do diário). O gráfico de barras destaca o
     dia mais recente com uma etiqueta de valor.

Emojis, gradientes e o símbolo de "brilhos" continuam fora. Ícones são Lucide, inclusive por categoria da TACO
(`components/food/CategoryIcon.tsx`).
