---
tags: [api, routes, endpoints]
---

# API Routes

Base: `apps/web/src/app/api/`

## Programs
- `GET /api/programs` — list all
- `POST /api/programs` — create
- `GET/PUT/DELETE /api/programs/[id]` — CRUD + FK guard

## Holders
- `GET /api/holders` — list all
- `POST /api/holders` — create
- `GET/PUT/DELETE /api/holders/[id]` — CRUD + FK guard

## Clientes (cpfs)
- `GET /api/clientes` — list all (queries `cpfs` table)
- `POST /api/clientes` — create
- `GET/PUT/DELETE /api/clientes/[id]` — CRUD + FK guard (ticket_cpfs + sales)

## Operation Types
- `GET /api/operation-types` — list all
- `POST /api/operation-types` — create
- `GET/PUT/DELETE /api/operation-types/[id]` — CRUD + FK guard (entries)

## Entries
- `GET /api/entries` — list with joins (program, holder, operation_type)
- `POST /api/entries` — create (trigger: credits balance)
- `GET/PUT/DELETE /api/entries/[id]` — CRUD

## Transfers
- `GET /api/transfers` — list with joins
- `POST /api/transfers` — create (trigger: debit from + credit to)
- `GET/PUT/DELETE /api/transfers/[id]` — CRUD

## Sales
- `GET /api/sales` — list with joins (program, holder, buyer, tickets + ticket_cpfs merged)
- `POST /api/sales` — create (validates miles category)
- `GET/PUT/DELETE /api/sales/[id]` — CRUD + FK guard (tickets)
- `PUT /api/sales/[id]` — update (trigger: recalc profit if value/pts changed)

## Tickets
- `GET /api/tickets` — list with ticket_cpfs
- `POST /api/tickets` — create + link cpf_ids via ticket_cpfs
- `GET/PUT/DELETE /api/tickets/[id]` — CRUD

## Balances
- `GET /api/balances` — filtered by program_id + holder_id

## Tickets Check
- `GET /api/tickets/check` — check emission limits per program+cpf
