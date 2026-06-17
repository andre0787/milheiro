---
tags: [business, rules, flow]
---

# Business Rules

## Flow Principal
```
Entrada (compra de pontos) → Transferência (pontos→milhas) → Venda (milhas→cliente)
```

## Venda → Bilhete → Viajantes
- **Comprador** (`buyer_id`): quem pagou (FK→cpfs)
- **Bilhete** (`tickets`): criado inline no form de venda
- **Viajantes** (`ticket_cpfs`): N CPFs por bilhete
- Comprador ≠ Viajante (podem ser pessoas diferentes)

## CPM (Custo Por Mil)
- Calculado como média ponderada nas entradas
- Armazenado em `balances.cpm` (GENERATED column)
- Exibido no dashboard e no form de venda (estoque disponível)

## Lucro da Venda
- `profit_auto = sale_value - (points_sold * cpm_at_sale / 1000)`
- `profit_final = COALESCE(profit_override, profit_auto)`
- Recalculado automaticamente no UPDATE se value/pts mudarem
- Trigger: `trg_sale_update_profit` (condicional)

## Flag de Recebimento
- `received` BOOL no sales
- Toggle dinâmico na tabela de vendas (ReceivedToggle)
- **PnL**: apenas vendas com `received = true`
- **Aguardando Recebimento**: soma das vendas com `received = false`
- Estoque: **não** é afetado pelo toggle (trigger só no INSERT)

## Limites de Emissão
- Programas `miles` podem ter `emission_limit`
- Por CPF + programa: rolling window ou fixed date
- Cooldown em dias entre emissões
- Verificação via `/api/tickets/check`

## FK Delete Guards
- Todos os endpoints DELETE verificam dependências
- Mensagens incluem nomes reais dos registros vinculados
- Ex: "Não é possível excluir: bilhete '123-45678', comprador na venda 'Azul'"

## Temas
- Light: Corporate (daisyUI) — azul primário, teal accent
- Dark: Business (daisyUI) — azul escuro, laranja accent
- Toggle via ThemeToggle no canto inferior do sidebar
