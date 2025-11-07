# ETAPA 1 - Correção do Single Session

## Resumo das Mudanças

Implementei a correção completa do sistema de single session por tenant. Agora cada usuário só pode ter **1 sessão ativa por tenant/escopo** conforme esperado.

## Pontos Críticos Corrigidos

### 1. **Chamada Incorreta do RPC**
**PROBLEMA**: O código estava chamando `app.start_session` mas a migration define a função no schema `app` (não `public`), então o nome correto é apenas `start_session`.

**SOLUÇÃO**: Ajustei todas as chamadas para usar `(supabase as any).rpc('start_session', ...)` em vez de `app.start_session`.

### 2. **Início Automático da Sessão**
**PROBLEMA**: A sessão não era iniciada automaticamente após o `currentTenantRole` ser resolvido. Dependia de refresh manual.

**SOLUÇÃO**: No `useSingleSession.ts`, adicionei um `useEffect` que:
- Aguarda `roleAtLogin` OU `currentTenantRole` estar definido
- Automaticamente chama `start_session` assim que a role resolver
- Mantém heartbeat a cada 5 minutos via `touch_session`
- Desloga automaticamente se o heartbeat falhar

### 3. **Integração no MultiTenantContext**
**PROBLEMA**: O `startSingleSession` era chamado mas não reiniciava quando o usuário trocava de tenant.

**SOLUÇÃO**: 
- Alterado `startedRef.current` de boolean para string (armazena `scopeKey`)
- `scopeKey = ${userId}_${subdomain || 'master'}`
- Sempre que user, role ou subdomain mudam, reinicia a sessão se o scopeKey for diferente
- Logs detalhados para debug

### 4. **Logout Correto**
**PROBLEMA**: O logout não revogava a sessão no banco antes de deslogar.

**SOLUÇÃO**: No `Header.tsx`, o `handleLogout` agora:
1. Chama `endSession()` para revogar a sessão no banco
2. Depois chama `signOut()` do Supabase
3. Redireciona para login

### 5. **Logs Detalhados**
Adicionei logs em todos os pontos críticos:
- `[SingleSession]` - hook useSingleSession
- `[MultiTenant]` - MultiTenantContext

Isso facilita debug e validação.

## Como Funciona Agora

### Fluxo de Login
1. Usuário faz login via `AuthContext`
2. `MultiTenantContext` detecta `user` e resolve `currentTeam`
3. `MultiTenantContext` busca `currentTenantRole` do tenant
4. Quando `currentTenantRole` está definida, `useSingleSession` é acionado
5. `useSingleSession` chama `start_session` automaticamente
6. `start_session` (RPC do banco):
   - Revoga qualquer sessão ativa anterior do mesmo user + team_id
   - Cria nova sessão
   - Retorna ID da sessão
7. ID é salvo em `localStorage` com chave `sess_{scope}`
8. Heartbeat inicia (toque a cada 5 min)

### Fluxo de Troca de Tenant
1. Usuário troca de tenant (via `TenantIndicator`)
2. `MultiTenantContext` detecta mudança de `subdomain`
3. `currentTeam` e `currentTenantRole` são resolvidos para o novo tenant
4. `useSingleSession` detecta novo `scopeKey`
5. Inicia nova sessão para o novo tenant
6. Sessão anterior do tenant antigo permanece revogada

### Fluxo de Logout
1. Usuário clica em logout
2. `Header` chama `endSession()`
3. `endSession()` chama `end_session` RPC para revogar sessão
4. Remove ID do localStorage
5. Chama `signOut()` do Supabase
6. Redireciona para login

## Validação

Para testar:

1. **Login em 2 abas no mesmo tenant**:
   - Abrir aba normal no Chrome
   - Fazer login
   - Abrir aba anônima
   - Fazer login com MESMO usuário no MESMO tenant
   - ✅ A primeira sessão deve ser revogada automaticamente
   - Console deve mostrar `[SingleSession] Sessão criada: <uuid>`

2. **Login em diferentes tenants**:
   - Login em `tenant1.delliapp.com.br`
   - Login em `tenant2.delliapp.com.br` (mesmo user)
   - ✅ Ambas sessões devem coexistir (escopos diferentes)

3. **Master domain**:
   - Login em `app.delliapp.com.br`
   - ✅ Sessão com scope `master`
   - Independente dos tenants

4. **Heartbeat e expiração**:
   - Login e deixar aba aberta
   - A cada 5 minutos: console mostra `[SingleSession] Heartbeat para sessão: <uuid>`
   - Após 30 dias idle: sessão expira automaticamente

## Arquivos Modificados

1. `src/hooks/useSingleSession.ts` - Correção de RPCs e início automático
2. `src/context/MultiTenantContext.tsx` - Integração com scopeKey e logs
3. `src/components/Header.tsx` - Logout com endSession
4. `src/pages/Index.tsx` - Resolução de merge conflicts
5. `src/components/checkout/DeliveryAddressForm.tsx` - Resolução de merge conflicts
6. `supabase/functions/_shared/cors.ts` - Resolução de merge conflicts

## Próximo Passo (ETAPA 2)

Após validar que ETAPA 1 está funcionando:
- Corrigir bug de role não aparecer no primeiro login
- Forçar re-render sincronizado após login sem necessidade de refresh
