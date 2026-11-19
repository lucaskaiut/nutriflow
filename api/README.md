# NutriFlow — API (Laravel 13)

Derivada do nox-skeleton. Instalação, variáveis de ambiente, migrations e testes:
veja o [README da raiz](../README.md). Arquitetura, modelagem e regras de cálculo:
[docs/arquitetura.md](../docs/arquitetura.md).

Módulos do NutriFlow: `app/Modules/{Nutrition,Account,Food,Recipe,SavedMeal,Diary,Goal,Tracking,Report}`.
Base TACO: `database/data/taco` (fonte e tratamento em `README.md`).

## Produção

- URL: `https://nutriflow-api.noxtecnologias.com.br/api` (Docker Swarm na VPS, atrás do Traefik).
- Deploy automático: push em `main` com mudanças em `api/` dispara o job Jenkins `deploy-nutriflow-webhook`,
  que reconstrói a imagem e atualiza o serviço sem downtime. A stack fica no repositório de infraestrutura.
