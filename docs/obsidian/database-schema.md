---
tags: [schema, database, supabase]
---

# Database Schema

## Tables

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default: `00000000-...-000001` |
| name | TEXT | |
| slug | TEXT | |

### programs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name, slug | TEXT | |
| category | `points` \| `miles` | |
| emission_limit | INT | Max tickets per CPF |
| limit_window_type | `rolling` \| `fixed` \| `none` | |
| limit_window_days | INT | |
| cooldown_days | INT | Min days between tickets |

### holders
id, tenant_id, name, nickname

### cpfs (Clientes)
id, tenant_id, name, document, telegram

### operation_types
id, tenant_id, name, slug, is_purchase BOOL

### entries
| Column | Type |
|--------|------|
| id, tenant_id | UUID |
| program_id, holder_id | FK |
| operation_type_id | FK? |
| date | DATE |
| points | INT |
| cost | DECIMAL |

### transfers
| Column | Type |
|--------|------|
| from_program_id, to_program_id | FK |
| holder_id | FK |
| points_sent, bonus_pct, points_received | |
| transfer_fee | DECIMAL |

### sales
| Column | Type | Notes |
|--------|------|-------|
| program_id, holder_id | FK | |
| buyer_id | FK→cpfs | Comprador |
| ticket_id | FK→tickets | Bilhete vinculado |
| points_sold | INT | |
| sale_value | DECIMAL | |
| profit_auto | DECIMAL | Calculado por trigger |
| profit_override | DECIMAL | Opcional |
| profit_final | DECIMAL | COALESCE(override, auto) |
| received | BOOL | Flag de recebimento |
| cpm_at_sale | DECIMAL | |

### tickets
| Column | Type | Notes |
|--------|------|-------|
| program_id, holder_id, sale_id | FK | |
| issued_at | DATE | |
| outbound_date, return_date | DATE? | Ida/volta |
| ticket_info | TEXT | Código do bilhete |

### ticket_cpfs (N:N)
| Column | Type |
|--------|------|
| ticket_id | FK→tickets |
| cpf_id | FK→cpfs |

### balances (materialized via triggers)
| Column | Type |
|--------|------|
| program_id, holder_id | FK |
| total_points | INT |
| total_cost | DECIMAL |
| cpm | DECIMAL GENERATED |

## Triggers

| Trigger | Event | Action |
|---------|-------|--------|
| trg_entry_upsert | BEFORE INSERT | Credits balance |
| trg_entry_delete | AFTER DELETE | Reverts balance |
| trg_sale_upsert | BEFORE INSERT | Debits balance + calc profit |
| trg_sale_delete | AFTER DELETE | Reverts balance |
| **trg_sale_update_profit** | BEFORE UPDATE | Recalc profit (conditional) |
| trg_transfer_upsert | BEFORE INSERT | Debit from + credit to |
| trg_transfer_delete | AFTER DELETE | Reverts transfer |

### Sale update trigger only fires when:
```sql
OLD.sale_value IS DISTINCT FROM NEW.sale_value
OR OLD.points_sold IS DISTINCT FROM NEW.points_sold
OR OLD.profit_override IS DISTINCT FROM NEW.profit_override
OR OLD.program_id IS DISTINCT FROM NEW.program_id
OR OLD.holder_id IS DISTINCT FROM NEW.holder_id
```

## FK Delete Guards
All DELETE endpoints check dependencies before allowing deletion:
- **Clientes**: ticket_cpfs + sales (buyer)
- **Titulares**: entries + transfers + sales + tickets
- **Programas**: entries + transfers + sales + tickets + balances
- **Vendas**: tickets
- **Tipos Op**: entries
