# TACO — Tabela Brasileira de Composição de Alimentos (4ª edição revisada e ampliada, 2011)

**Fonte:** Núcleo de Estudos e Pesquisas em Alimentação (NEPA) — Universidade Estadual de Campinas (UNICAMP).
<http://www.nepa.unicamp.br/taco/tabela.php>

> NÚCLEO DE ESTUDOS E PESQUISAS EM ALIMENTAÇÃO – NEPA/UNICAMP. *Tabela Brasileira de Composição de
> Alimentos – TACO*. 4. ed. rev. e ampl. Campinas: NEPA-UNICAMP, 2011. 161 p.

Os CSVs desta pasta são a versão normalizada publicada em <https://github.com/raulfdm/taco-api>
(`references/csv`, licença MIT para o tratamento), derivada do arquivo original
`Taco_4a_edicao_2011.xls` do NEPA. Tratamento aplicado na origem:

| Marcação TACO | Significado | Valor no CSV / no NutriFlow |
|---|---|---|
| `NA` | Não aplicável | vazio → `NULL` (não informado) |
| `*` | Amostra em reavaliação | vazio → `NULL` (não informado) |
| `Tr` | Traço (entre 0 e 0,5) | `0` |

**Todos os valores são por 100 g de parte comestível.** Nenhum valor ausente é estimado ou
preenchido pelo NutriFlow: o app exibe "—" e, nas somas, um nutriente desconhecido não contribui.

Mapeamento de colunas usado pelo `TacoFoodSeeder`:

| CSV (`nutrients.csv`) | NutriFlow |
|---|---|
| `kcal` | `foods.kcal` |
| `protein` | `foods.protein_g` |
| `carbohydrates` | `foods.carbs_g` |
| `lipids` | `foods.fat_g` |
| `dietaryFiber` | `foods.fiber_g` |
| `sodium`, `cholesterol`, `calcium`, `iron`, `potassium`, `magnesium`, `phosphorus`, `zinc`, `vitaminC` | `food_nutrients` (mg) |
