# Correções de Deploy e Problemas Identificados

## 1. Erro 522 do Cloudflare (Connection Timeout)

### Problema
O erro 522 indica que o Cloudflare não consegue se conectar ao servidor de origem dentro do tempo limite.

### Soluções Implementadas

#### A. Correção do wrangler.toml
- **Adicionado**: `pages_build_output_dir = "dist"`
- **Motivo**: O Cloudflare Pages precisa saber onde estão os arquivos buildados

#### B. Verificações Necessárias
1. **DNS**: Verificar se os registros DNS estão corretos
2. **SSL**: Certificados SSL válidos
3. **Firewall**: Regras de firewall não bloqueando o Cloudflare
4. **Build**: Processo de build completando com sucesso

## 2. Erro RLS na Criação de Teams

### Problema
```
new row violates row-level security policy for table "teams"
```

### Solução Implementada

#### A. Correção no Hook useSupabaseWithMultiTenant
- **Adicionado**: Verificação de admin geral baseada no hostname
- **Configuração RLS**: Diferenciação entre `admin` e `general_admin`

```typescript
// Verificação de admin geral
const isGeneralAdmin = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname === 'app.delliapp.com.br';
```

#### B. Permissões Atualizadas
- **createTeam**: Apenas admin geral pode criar
- **updateTeam**: Apenas admin geral pode atualizar
- **deleteTeam**: Apenas admin geral pode deletar

#### C. Configuração RLS
```sql
-- Para admin geral
app.current_user_role = 'general_admin'
app.current_team_id = 'null'

-- Para admin normal
app.current_user_role = 'admin'
app.current_team_id = 'null'

-- Para usuário normal
app.current_user_role = 'user'
app.current_team_id = '{team_id}'
```

## 3. Logs de Deploy

### Warning Resolvido
```
WARNING: Pages now has wrangler.toml support.
We detected a configuration file at wrangler.toml but it is missing the
"pages_build_output_dir" field, required by Pages.
```

**Solução**: Adicionado `pages_build_output_dir = "dist"` no wrangler.toml

## 4. Próximos Passos

### Para Resolver o Erro 522
1. Verificar se o build está sendo executado corretamente
2. Confirmar que os arquivos estão sendo gerados na pasta `dist`
3. Verificar configurações de DNS no Cloudflare
4. Testar o deploy novamente

### Para Testar as Correções RLS
1. Acessar `app.delliapp.com.br` (modo admin geral)
2. Tentar criar um novo cliente/team
3. Verificar se não há mais erro de RLS
4. Confirmar que apenas admin geral pode criar teams

## 5. Estrutura de Permissões

```
General Admin (app.delliapp.com.br)
├── Pode criar/editar/deletar teams
├── Acesso total a todos os dados
└── Gerenciamento do sistema

Admin Normal (cliente.delliapp.com.br)
├── Acesso apenas aos dados do seu team
├── Não pode criar novos teams
└── Gerenciamento do restaurante

Usuário Normal
├── Acesso limitado aos dados do team
└── Operações básicas
```

## 6. Comandos para Deploy

```bash
# Build do projeto
npm run build

# Deploy para Cloudflare Pages
npx wrangler pages deploy dist

# Verificar status
npx wrangler pages deployment list
```