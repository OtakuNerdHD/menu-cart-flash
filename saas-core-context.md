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