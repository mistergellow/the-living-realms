# Mapa de impacto (CHANGE_MAP)

Para cada conceito do jogo: **todos os sítios que têm de mudar** quando o
conceito muda. Usar como checklist. Abrir **só o ficheiro da área** que se vai
mexer (ou `grep -rn "<conceito>" docs/change-map/`).

Ordem habitual de alteração: **contrato (shared) → regras (game-core) → base de
dados (db + migração) → servidor → worker → web → testes → documentação**.

> Manter atualizado: ao ligar um ficheiro novo a um conceito, acrescentá-lo no
> ficheiro da área. Conceito novo → secção nova na área certa + linha aqui.
> Verificação rápida: `grep -rn "<nome>" apps packages e2e --include=*.ts --include=*.tsx`

## Áreas

- [`change-map/account.md`](change-map/account.md) — Conta; Password / segurança da conta; Sessão / login; Um personagem ativo por conta
- [`change-map/character.md`](change-map/character.md) — Personagem; Atributos; Estatísticas derivadas; Itens, equipamento e qualidade/durabilidade; Habilidades; Reputação; Nome do personagem; Limite de personagens por conta; Aparência do personagem e arte
- [`change-map/world.md`](change-map/world.md) — Posição no mapa / hexágonos; Mundo e relógio; Mensagem WebSocket; Códigos de fecho WebSocket; Presença; Evento do mundo
- [`change-map/combat.md`](change-map/combat.md) — Formação / posições; Combate; Estados, Block e intenções; Inimigos; Rifts e corridas; Combate em grupo; Barra de habilidades
- [`change-map/social.md`](change-map/social.md) — Amigos; Lobbies de Rift
- [`change-map/ui.md`](change-map/ui.md) — Renderer canvas; Tema visual e tamanhos de ecrã; Hub, barra de topo e navegação
- [`change-map/platform.md`](change-map/platform.md) — Código de erro; Tabela ou coluna nova na base de dados; Variável de ambiente; Ecrã / rota nova no frontend; Módulo de servidor novo; Deploy / produção
