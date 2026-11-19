# Identidades visuais — catálogo de referência

O design system do skeleton (`web/src/shared/design-system/`) é **neutro de marca**: os
componentes só usam tokens (`bg-surface`, `text-primary`, `shadow-card`, `rounded-lg`…).
Por isso um projeto derivado troca de identidade mexendo em **poucos arquivos**, sem
reescrever componentes.

Este documento registra as identidades já usadas, para que um projeto novo escolha uma
(ou crie outra) de propósito — e não herde o visual de outro produto por acidente.

---

## Onde uma identidade mora

| O quê | Arquivo | Observação |
|---|---|---|
| Cores (claro/escuro) | `web/src/index.css` → `:root` e `.dark` | Tokens `--app-*`. Mantenha os **nomes**; troque os valores. |
| Fontes | `web/src/index.css` → `@theme inline` (`--font-sans`, `--font-display`) + `<link>` no `web/index.html` | |
| Cantos | `web/src/index.css` → `@theme inline` (`--radius-md/lg/xl/2xl`) | Sobrescrever a escala muda **todos** os `rounded-*` de uma vez. |
| Elevação | `--app-shadow-card/raised/pop` | Pode virar contorno: `0 0 0 1px var(--app-border)`. |
| Navegação | `web/src/app/layouts/AppLayout.tsx` | Sidebar, topo, etc. É CORE só a infraestrutura; o layout pode mudar no derivado. |
| Tela de login | `web/src/app/layouts/AuthLayout.tsx` | |
| Marca | `web/index.html` (`<title>`, favicon), `web/public/favicon.svg` | |

Regra: **não renomeie tokens nem altere a API dos componentes** num derivado — isso
quebra a sincronização de arquivos CORE com o skeleton. Troque valores e layouts.

---

## 1. Índigo Neutro (padrão do skeleton)

**Usada por:** nox-skeleton, nox-tasks, monensure, nox-cms.

- **Clima:** SaaS genérico, limpo, "ferramenta de trabalho".
- **Cores:** cinza-azulado frio (`--app-bg #f6f7f9`, `--app-surface #ffffff`), primária
  índigo vívido `#4f46e5` (escuro: `#6366f1`). Status: verde `#059669`, âmbar `#b45309`,
  vermelho `#dc2626`.
- **Tipografia:** Inter em tudo.
- **Forma:** cantos generosos (`rounded-lg`/`rounded-xl` padrão do Tailwind), cards
  flutuando com sombra suave.
- **Navegação:** sidebar fixa à esquerda (256px) + topbar com seletor de tenant e usuário.
- **Quando usar:** painéis administrativos multiusuário com muitos módulos.

> Observação: como quatro produtos compartilham esta identidade, eles são visualmente
> indistinguíveis. Para um produto voltado ao cliente final, prefira uma identidade própria.

---

## 2. Papel & Tinta

**Usada por:** glicemia (`~/development/glicemia`).

- **Clima:** editorial, calmo, "caderno de saúde". Pensada para leitura de números e
  gráficos, não para muitos CRUDs.
- **Cores (claro):** papel quente `--app-bg #f3efe6`, superfície `#fbf9f4`, contorno
  `--app-border #d9d1c1`, tinta `--app-fg #1d2330`, primária azul-tinta `#23395b`,
  acento terracota `--app-accent #b4532a`.
- **Cores (escuro):** noite azulada `#11161d`/`#171d26`, primária `#9db8e0`, acento `#e08a5f`.
  O escuro é **escolhido**, não invertido — cada valor foi definido para a superfície escura.
- **Tipografia:** Fraunces (serifa, títulos e números grandes, `font-display`) + Manrope
  (interface). Números tabulares (`font-feature-settings: 'tnum'`).
- **Forma:** cantos quase retos (`--radius-lg: 5px`, `--radius-xl: 6px`); **sem sombras** —
  cards usam contorno fino (`--app-shadow-card: 0 0 0 1px var(--app-border)`).
- **Navegação:** **barra no topo** com abas sublinhadas pelo acento; configurações
  agrupadas num menu "Ajustes"; conteúdo centralizado (`max-w-6xl`). Menu recolhível no celular.
- **Login:** tela dividida, com manchete em serifa à esquerda e formulário à direita.
- **Tokens extras (domínio):** `--range-very-low/low/in/high/very-high` e `--chart-grid`.
  A primária **não** é verde/teal de propósito, para não competir com "no alvo".
- **Quando usar:** produto de uso pessoal/consumidor, dashboards de leitura, relatórios.

### Paleta de dados validada (faixas glicêmicas, convenção AGP)

| Faixa | Claro | Escuro |
|---|---|---|
| Muito baixa | `#a3262a` | `#ac2f3b` |
| Baixa | `#e0563f` | `#dd6d45` |
| No alvo | `#1e8a6e` | `#009d82` |
| Alta | `#d39a1a` | `#b18e15` |
| Muito alta | `#b85a12` | `#b14d00` |

Validada com o script de paleta (faixa de luminosidade, croma mínimo, separação para
daltonismo protan/deutan e contraste com a superfície). Os avisos restantes (separação
7,0 no claro; contraste < 3:1 do amarelo) são compensados com **rótulo em texto em toda
ocorrência** e a lista de medições como visão em tabela — a cor nunca carrega a informação sozinha.

---

## Criando uma identidade nova

1. **Defina o clima em uma frase** (ex.: "terminal técnico", "clínica acolhedora").
2. **Escolha a navegação primeiro** — sidebar, topo ou trilho de ícones. É o que mais
   diferencia um produto do outro, mais que a cor.
3. **Tipografia:** um par (display + interface) diferente dos já usados aqui.
4. **Cores:** reescreva `:root` e `.dark` em `index.css` mantendo todos os nomes `--app-*`.
   Defina o escuro à mão. Garanta contraste AA para texto (`--app-fg`, `--app-fg-muted`).
5. **Forma:** ajuste `--radius-*` e as três sombras.
6. **Se houver gráficos:** valide a paleta de dados para daltonismo e mantenha a cor da
   marca diferente das cores de status/dados.
7. **Confira em claro, escuro e 390px de largura** (sem rolagem horizontal).
8. **Adicione a identidade a este documento.**

Direções ainda não usadas, para referência: *trilho de ícones + fundo grafite e acento
neon* (ferramentas técnicas); *alto contraste preto/branco com uma cor de destaque*
(marketing/conteúdo); *pastel arredondado com ilustrações* (educação/infantil).

---

## Pátio Operacional (protótipo)

**Usada por:** protótipo da proposta CEASA-PR (`~/development/nox-proposta-ceasa-pr/prototipo`). Ainda não foi aplicada ao skeleton.

- **Clima:** sistema operacional de alta intensidade (guichê, portaria), institucional.
- **Cores (claro):** palha `#f3f5f1`, superfície `#ffffff`, contorno `#d9ded6`, primária verde `#0a6b3b`, destaque verde-folha `#5dbb63`. Status: âmbar `#b7791f`, vermelho `#c2412d`, azul-aço `#2f6690`.
- **Cores (escuro):** `#0e1511` / `#151f19`, primária `#2f9a5b`, destaque `#6bd27a`.
- **Tipografia:** Public Sans (interface) + IBM Plex Mono (códigos, placas, valores).
- **Forma:** cantos 6px (cartões) / 4px (botões e campos); contorno de 1px, sem sombras.
- **Navegação:** topbar escura com seletor de unidade + faixa de abas do módulo; telas de quiosque em tela cheia escura.
