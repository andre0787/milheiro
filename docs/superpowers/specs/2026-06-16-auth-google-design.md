# Design: Autenticação Google — Milheiro

**Data**: 2026-06-16
**Versão**: v0.2.0
**Status**: Aprovado

## Decisões de Design

| Questão | Decisão |
|---------|---------|
| Modelo usuário/tenant | 1 usuário = 1 tenant (app pessoal) |
| Migração dados existentes | Associar primeiro usuário Google ao tenant `0000...0001` (dados atuais continuam acessíveis) |
| Fluxo de login | Middleware redireciona para `/login`; pós-login volta à página original |
| Permissões RLS | Full CRUD no próprio tenant (equivalente ao `allow_all`, mas isolado) |
| Provider OAuth | Apenas Google |
| Posição identidade usuário | Topo do Sidebar (avatar + nome) com logout no rodapé |
| Título login | "Gestão — Estoque de Pontos e Milhas" |

## Arquitetura

### Fluxo de Autenticação

```
Usuário acessa /qualquer-rota
  → Middleware: sem sessão? → redirect /login
  → Middleware: com sessão? → refresh session cookie → continua

/login
  → Botão "Entrar com Google"
  → signInWithOAuth('google') → redirect Google

/auth/callback
  → Troca code por session (via browser client)
  → 1º login: cria entry em user_tenants (user_id ↔ tenant 0000...0001)
  → redirect / (ou página original)

Requisição autenticada
  → Server Component: get_tenant_id() via RLS helper
  → Browser Component: usa createBrowserClient (sessão em cookie)
```

### Componentes

| Arquivo | Tipo | Função |
|---------|------|--------|
| `middleware.ts` | Server | Refresca sessão Supabase; redirect `/login` se não autenticado |
| `app/login/page.tsx` | Client | Tela de login com botão Google |
| `app/auth/callback/route.ts` | Client | Callback OAuth; 1º login associa user→tenant |
| `components/auth-provider.tsx` | Client | Contexto React com user, session, signOut |
| `components/user-menu.tsx` | Client | Avatar + nome no topo do sidebar; logout no rodapé |
| `lib/supabase/server.ts` | Server | Corrigir `setAll` para gravar cookies (hoje é no-op) |
| `lib/supabase/middleware.ts` | Server | `createServerClient` específico para middleware |

### Migração 011: Banco de Dados

```sql
-- Tabela de mapeamento user → tenant
CREATE TABLE user_tenants (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função helper para RLS
CREATE FUNCTION get_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() $$;

-- Substituir allow_all por tenant_isolation em todas as 11 tabelas
-- Exemplo:
DROP POLICY "allow_all" ON programs;
CREATE POLICY "tenant_isolation" ON programs
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());
```

### Alterações em Arquivos Existentes

| Arquivo | Mudança |
|---------|---------|
| `app/layout.tsx` | Envolver em `<AuthProvider>`; Sidebar recebe user info |
| `components/sidebar.tsx` | Topo: avatar + nome usuário; Footer: botão logout |
| `lib/supabase/server.ts` | `setAll` implementado: grava cookies de sessão (`cookieStore.set(c.name, c.value)`). O `tenant_id` do usuário é resolvido pelo banco via `get_tenant_id()` — o server client NÃO consulta `user_tenants` diretamente. |
| `app/page.tsx` | Dashboard usa `createClient()` padrão (sem hardcoded tenant). RLS filtra automaticamente. |
| `globals.css` | Estilos para botão Google, avatar, sidebar user section |

### O que NÃO muda

- Nenhuma página CRUD alterada (programas, holders, clientes, entradas, transfers, vendas, tickets)
- Nenhum API route handler alterado
- Nenhum componente de formulário/tabela alterado
- `tenant_id` permanece em todas as tabelas
- Admin client (`service_role`) continua disponível para bypass RLS

### Configuração Google Cloud

1. Acessar https://console.cloud.google.com/apis/credentials
2. Criar "OAuth 2.0 Client ID" tipo Web Application
3. Authorized redirect URIs:
   - `https://web-alpha-ashy-0yn7kj4k5v.vercel.app/auth/callback` (produção)
   - `https://web-*.vercel.app/auth/callback` (preview)
   - `http://localhost:3000/auth/callback` (dev)
4. Anotar Client ID e Client Secret → Supabase Dashboard → Authentication → Providers → Google

### Preview URLs

Ao ativar Google OAuth, preview deploys precisam de uma URL de callback curinga. Usar o Vercel preview URL pattern: `https://web-*.vercel.app/auth/callback` ou configurar via Supabase `additional_redirect_urls` com padrão.

### Critérios de Aceitação

- [x] Usuário não logado → redirecionado para `/login`
- [x] Botão Google inicia fluxo OAuth
- [x] Callback completa autenticação e redireciona
- [x] Primeiro login associa ao tenant existente (dados preservados)
- [x] Sidebar mostra avatar + nome do Google
- [x] Logout limpa sessão e redireciona para `/login`
- [x] RLS isola dados por tenant (usuário A não vê dados do B)
- [x] Todas as páginas CRUD continuam funcionando
- [x] `.or()` queries do Supabase funcionam com RLS ativa
- [x] TypeScript passa sem erros (`npx tsc --noEmit`)

### Risco: `.or()` com RLS

As queries existentes usam `.or('col.eq.val,col.is.null')`. Com RLS por `tenant_id`, o `.or()` pode conflitar se o PostgREST interpretar a cláusula como bypass do filtro RLS. Solução: garantir que as políticas RLS são aditivas (AND, não OR) e testar cada endpoint após ativar RLS.
