# gifisi-harness

[English](README.md) · **Português (Brasil)**

[![CI](https://github.com/GiFiSi/gifisi-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/GiFiSi/gifisi-harness/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933.svg)](docs/setup.md)

Um roteador sempre ativo, 22 playbooks e skills sob demanda: um harness de engenharia para agentes de código no Claude Code, no Codex e no Cursor.

O roteador tem menos de 150 linhas e é a única coisa carregada no início da sessão. Ele classifica cada pedido e escolhe um playbook; o agente só abre playbooks, skills e princípios quando um passo precisa deles. Você nunca digita um comando com barra.

O projeto junta dois projetos MIT: os playbooks, princípios e skills do [pstack, de Lauren Tan](https://github.com/cursor/plugins/tree/main/pstack), e a preparação da máquina, o bootstrap, a adoção de projetos, a organização dos docs e os portões de qualidade do [Vibe Coding Toolkit, de Matheus Gomes](https://github.com/soumatheusgomes/vibe-coding-toolkit).

## Como funciona

```text
pedido ──> roteador ──> playbook ──> skills (quando um passo precisa) ──> predicado de pronto
              │                                                            │
              └── cabeçalho impresso primeiro                observado no artefato real
```

Em qualquer tarefa que não seja trivial, o agente imprime este cabeçalho antes de ler ou editar código:

```text
[GIFISI-HARNESS] Task Type: <categoria> | Playbook: <playbook escolhido>
Reason: <1 frase dizendo por que esse playbook serve>
Done Predicate: <condição exata e verificável no artefato real>
```

Em seguida copia os passos numerados do playbook para a lista de tarefas e os executa em ordem. Só termina depois de observar o predicado no app rodando, na saída do CLI ou no arquivo gerado; se não conseguir observar, informa `INCONCLUSIVE`. Cada decisão e verificação vira uma linha em `.gifisi/decisions.tsv`, e erros repetidos sobem uma escada de correção: primeiro a arquitetura, depois um lint ou teste, por último texto. Quando duas rotas servem, `node scripts/classify-task.mjs "<pedido>"` as ordena, com sinais em inglês e em português. O desenho está em [docs/design.md](docs/design.md) (em inglês).

## Início rápido

Requisitos: Node 18 ou mais novo e bash (Git Bash no Windows). Não há dependências npm.

```bash
./install.sh --project /caminho/do/seu-projeto   # um projeto
./install.sh --global                            # todas as sessões da sua conta
```

Use `--dry-run` para mostrar as ações sem gravar nada. Rodar o mesmo comando duas vezes é seguro: a segunda execução informa `writes=0`. O seu texto em `AGENTS.md`, `CLAUDE.md`, `~/.claude/CLAUDE.md` e `~/.codex/AGENTS.md` é mantido byte a byte; o roteador fica em um bloco gerenciado. O instalador nunca toca em `package.json`, lockfiles, testes, configurações de lint nem código-fonte. Detalhes e desinstalação em [docs/setup.md](docs/setup.md).

## O que tem dentro

| | | Onde |
|---|---|---|
| Playbooks | 22 | [core/playbooks/](core/playbooks/) |
| Princípios | 24 | [core/principles/](core/principles/) |
| Skills | 31 | [core/skills/](core/skills/) |
| Prompts | 9 | [core/prompts/](core/prompts/README.md) |
| Templates | 31 | [core/templates/](core/templates/) |

A lista completa, com uma linha por item, está em [docs/catalog.md](docs/catalog.md).

## Como verificar

Rode a partir de um checkout deste repositório:

```bash
node scripts/validate-harness.mjs          # conjuntos canônicos, formatos, links, deriva do roteador, testes
node scripts/check-install.mjs             # instala duas vezes por cenário: 1ª limpa, writes=0 na 2ª
node scripts/run-autonomous-smoke-test.mjs # app quebrado: reproduz, corrige, adiciona feature, refatora, verifica ao vivo
```

[docs/quality.md](docs/quality.md) explica o que cada um verifica e o que não verifica.

## Limites

- O teste de fumaça não é um agente. As edições de código são substitutos roteirizados; a classificação, os testes, as checagens HTTP ao vivo, o portão de qualidade e as linhas de decisão ao redor delas são execuções reais.
- A instalação global grava `.cursor/rules/gifisi-harness.mdc`. O Cursor pode só carregar regras de usuário que você adicionar nas Configurações, e o instalador não verifica se ele carrega.
- O roteador é texto. Um harness que ignora `AGENTS.md`, `CLAUDE.md` ou as regras do Cursor não o verá. O cabeçalho mostra quando o roteamento não aconteceu.
- Context7, Graphify e RTK são opcionais e verificados antes do uso.
- Instalar ferramentas, publicar, dar push e ações destrutivas continuam exigindo o seu OK explícito.

## Documentação

A documentação detalhada está em inglês: [Arquitetura](docs/architecture.md) · [Design](docs/design.md) · [Setup](docs/setup.md) · [Qualidade](docs/quality.md) · [Onboarding](docs/onboarding.md) · [Catálogo](docs/catalog.md) · [Produto](docs/PRODUCT.md) · [Contribuindo](docs/CONTRIBUTING.md) · [Segurança](SECURITY.md)

## Créditos e licença

MIT ([LICENSE](LICENSE)). Adapta o pstack, de Lauren Tan, e o Vibe Coding Toolkit, de Matheus Gomes, ambos MIT. Os textos das licenças e a lista do material adaptado estão em [docs/THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).
