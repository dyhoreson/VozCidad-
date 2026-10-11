# Conectar o frontend ao Supabase

1. Para configurar o banco, aplique as migrations oficiais em [`../../../supabase/migrations/`](../../../supabase/migrations/) seguindo [`../../../supabase/README.md`](../../../supabase/README.md). `schema.sql` contém somente o schema inicial para instalações manuais legadas.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave `sb_publishable_...`. O cliente também aceita a chave legada `anon` em `VITE_SUPABASE_ANON_KEY`. Reinicie o Vite depois de alterar variáveis.
3. Cadastre representantes pelos fluxos do Supabase Auth. O trigger cria um registro em `profiles` com papel `cidadao` e UF RN por padrão; a UF pode ser atualizada no perfil.
4. Para autorizar uma conta institucional, localize o UUID do usuário em **Authentication → Users** e ajuste o perfil no SQL Editor. Exemplo:

```sql
update public.profiles
set role = 'empresa', sector = 'Água e saneamento', municipio = 'Natal', uf = 'RN'
where id = 'UUID-DO-USUARIO';
```

Use `role = 'politico'` para representantes e `role = 'admin'` somente para administradores confiáveis. Nunca coloque a chave `sb_secret_...` ou `service_role` no frontend.

Denúncias são atribuídas automaticamente a uma conta `empresa` cujo `sector` corresponda à categoria e cujo município corresponda ao da denúncia (ou esteja vazio). Votos são agregados pela view `bill_vote_totals`, que não expõe a identidade dos votantes. Protocolos e anexos permanecem visíveis apenas ao remetente e ao destinatário.

`schema.sql` inclui somente o schema inicial legado. Use as migrations oficiais para instalar as colunas de UF, questionamentos e prazo de resposta dos protocolos.

### Autenticação por e-mail e provedores

- Em **Authentication → Providers**, mantenha **Email** habilitado. Se a confirmação de e-mail estiver ligada, o cadastro passa a aguardar o link enviado e permite reenviá-lo na tela de autenticação. Para entregabilidade em produção, configure SMTP próprio no Supabase.
- Em **Authentication → URL Configuration**, defina a URL do site como o domínio de produção e adicione-o às Redirect URLs. Inclua também `http://localhost:5173/**` durante desenvolvimento.
- Para Google, Microsoft (provedor Azure) e Apple/iCloud, habilite cada provedor em **Authentication → Providers** e informe as credenciais OAuth emitidas por cada serviço. Configure o callback fornecido pelo Supabase, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`, no provedor e permita como retorno a URL do Voz Cidadã.
- `VITE_SUPABASE_AUTH_PROVIDERS=google,azure,apple` é opcional para limitar quais botões aparecem. Sem a variável, a interface mostra os três quando Supabase está configurado. Esse código não substitui client IDs, secrets, configuração do domínio Apple nem a habilitação dos provedores no Supabase.

O endpoint `api/representatives.ts` consulta as APIs oficiais da Câmara e do Senado no servidor; isso evita bloqueios CORS no navegador. A função é publicada pela Vercel junto com o frontend e também é conectada ao servidor local de desenvolvimento/preview pelo `vite.config.js`. CAERN e Neoenergia Cosern aparecem como canais públicos de referência; para receber protocolos dentro da plataforma, cada instituição ainda precisa de uma conta institucional cadastrada e autorizada.

Protocolos de solicitação e questionamento ficam no perfil do cidadão. A migration habilita a categoria Questionamento e adiciona o prazo de 15 dias corridos; respostas institucionais existentes e o contador de atraso ficam visíveis nos protocolos ainda abertos. As contas de políticos e concessionárias precisam estar cadastradas com `role`, município e UF para receber e responder protocolos.

## APIs públicas na página de transparência

A página consulta diretamente a API JSON da Câmara dos Deputados e os dados do SICONFI. O endpoint atual do Senado responde XML; o serviço converte a lista para o mesmo formato tipado usado pela interface. As consultas externas têm timeout e os erros de cada fonte são exibidos sem esconder os dados das demais.

Contratos, licitações e repasses do Portal da Transparência exigem uma chave em `VITE_PORTAL_TRANSPARENCIA_KEY`. Variáveis `VITE_` são incluídas no bundle público e ficam visíveis no navegador; em produção, mantenha a chave do Portal no backend e use `VITE_PORTAL_TRANSPARENCIA_API_URL` para apontar a um proxy próprio. Nunca use uma chave secreta Supabase nesse serviço.

Os adaptadores municipais e estaduais aceitam endpoints JSON opcionais em `VITE_NATAL_TRANSPARENCIA_API_URL`, `VITE_RN_TRANSPARENCIA_API_URL` e `VITE_ASSEMBLEIA_RN_TRANSPARENCIA_API_URL`. Cada resposta pode ser um array JSON ou conter uma lista em `dados`, `items`, `data`, `content` ou `results`. Sem endpoint configurado, a interface mostra apenas o link oficial, sem inventar ou simular registros.
