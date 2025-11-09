DELLIAPP — CONTEXTO ESTRUTURAL BASE (NUNCA QUEBRAR)
Core do projeto

A aplicação DELLIAPP é um SaaS multi-team multi-tenant real, onde cada cliente/loja possui sua própria instância isolada via subdomínio.

Exemplo:
joaby.delliapp.com.br → Tenant / Restaurante específico
eliane.delliapp.com.br → outro Tenant independente

Não existe compartilhamento de dados entre tenants.

Domínio Master

app.delliapp.com.br é o domínio master.
Ele funciona como matriz / administrativo do SaaS.

Importante:

Ele não é um tenant.

Ele não pode listar dados de nenhum tenant.

Toda consulta no master deve retornar vazio, nunca pode vazar dados.

O código fonte principal do projeto roda nele (base original).
Futuramente será protegido por Cloudflare Access / Auth externa.

Isolamento garantido

Isolamento entre tenants ativado e funcional

Isolamento no domínio master ativado e funcional

Política central: tenant só vê o que pertence ao seu own team_id

RLS

RLS v2 está habilitado globalmente e funcionando sem regressões

Policies garantem isolamento por team_id

Não usar mais papéis/perfis globais do profile para autorização

Roles

As roles hoje são por tenant:

dono (owner real apenas daquela instância)

admin

garcom

cozinha

cliente

Essas roles controlam permissão por página.

Rules fixas p/ desenvolvimento a partir de agora

Esses pilares NUNCA PODEM SER QUEBRADOS POR IA / features futuras:

Não pode existir query / filtro sem team_id.

Nada do master pode enxergar dados de tenants.

Nenhuma nova página pode depender de role global, somente role do tenant.

Guard por página deve ser feito com useTenantRoleGuard SEM alterar RLS.

Sobre novas Features / UX / Páginas / Integrações

É permitido criar features novas, páginas novas, testes novos.

A UI pode ter erros / refactors futuros (OK).

O backend pode ter melhorias / ajustes (OK).

Mas nunca pode quebrar os pilares acima.

Como interpretar isto para IA futura

Sempre assumir que:

o código é multi-tenant maduro

RLS v2 é DEFINITIVO

isolamento é baseline — não é opcional / não mexer sem instrução explícita

Qualquer sugestão futura do agente deve manter esse ecossistema intacto.

Sessão Única por Tenant (Single Session)

Objetivo: garantir apenas uma sessão ativa por usuário dentro de cada escopo de tenant/subdomínio. Ao iniciar login em outra aba ou dispositivo no mesmo tenant, a sessão anterior é imediatamente revogada e o cliente é desconectado.

Implementação base (pilar técnico):

Tabela app.sessions com índice único por (user_id, team_id_text) onde revoked_at IS NULL — assegura 1 sessão ativa por escopo.

Wrappers RPC públicos: public.start_session, public.touch_session, public.end_other_sessions_current_scope — contratados para o frontend. Funções internas em app.* sob SECURITY DEFINER.

RLS nas operações de app.sessions limitando por user_id = auth.uid(). Não remover nem afrouxar.

Realtime: cliente assina UPDATE em app.sessions filtrando id=eq.<session_id>. Ao detectar new.revoked_at o cliente faz signOut imediato.

Fluxo no cliente (useSingleSession):

Somente tenants participam; o domínio master (app.delliapp.com.br) não cria sessões.

Escopo calculado por subdomínio e x-tenant-id (app.current_team_id). A sessão é persistida localmente por chave sess_<escopo> e revalidada continuamente.

Ao criar/reusar sessão, o cliente chama end_other_sessions_current_scope(p_keep_session) para encerrar outras do mesmo escopo.

Heartbeat e foco/visibilidade: o cliente chama touch_session periodicamente e ao retomar foco; se touch_session retornar erro (ex.: sessão revogada) o cliente desloga de forma imediata.

Regras que NUNCA podem ser quebradas:

Master não participa de sessão única; nunca criar/gerir sessões no master.

Não alterar a assinatura/nomes dos RPCs citados sem atualização coordenada em todo o frontend.

Manter o índice único e as políticas RLS de app.sessions.

Manter a assinatura Realtime e o tratamento de erro explícito de touch_session no cliente (logout imediato ao erro).

Manter a dependência de app.current_team_id resolvida via set_app_config e headers multi-tenant — qualquer desvio pode quebrar isolamento e o single session.

Validação operacional:

Ao logar em uma segunda aba no mesmo tenant, start_session deve retornar 200 e end_other_sessions_current_scope deve indicar revogação (>0). Na aba anterior, touch_session deve retornar 400 ou o Realtime deve publicar UPDATE com revoked_at, levando ao logout instantâneo.