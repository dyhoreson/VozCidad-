# Banco Supabase

As migrations oficiais ficam em `supabase/migrations/` e devem ser aplicadas em ordem pelo Supabase CLI. A migration inicial cria as tabelas, funções, políticas RLS e buckets; as seguintes adicionam gamificação, perfis, dados de políticos, UF dos perfis e prazos de resposta dos protocolos.

## Publicar em um projeto novo

No PowerShell, na raiz do repositório:

```powershell
npx supabase login
npx supabase link --project-ref atwmuxnemzissklnxkyv
npx supabase migration list --linked
npx supabase db push --dry-run
```

Confira se o dry run mostra as seis migrations pendentes em um projeto novo e se o projeto vinculado é o correto. Só então aplique:

```powershell
npx supabase db push
```

## Projeto com schema já aplicado

Se o schema foi executado manualmente pelo SQL Editor, não faça `db push` antes de conferir o estado remoto. A CLI precisa ter o histórico de migrations reconciliado com o schema existente; marcar uma migration como aplicada sem comparar seu conteúdo pode deixar o banco incompleto. Faça backup antes de alterações em um banco com dados.

`frontend/VozCidada/supabase/schema.sql` é apenas uma cópia do schema inicial para uso manual legado; não inclui todas as migrations posteriores. Não use junto com o fluxo de migrations.

Não versionar access tokens, senhas do banco, chaves secret/service_role ou arquivos `.env` preenchidos. Para o frontend, use apenas a Project URL e a chave publicável (`sb_publishable_...`) em `frontend/VozCidada/.env.local` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`). O cliente também aceita a chave legada `anon` em `VITE_SUPABASE_ANON_KEY`.

Depois de aplicar as migrations, configure os provedores de autenticação no dashboard e ajuste `profiles.role`, `profiles.sector`, `profiles.municipio` e `profiles.uf` dos representantes institucionais autorizados. A última migration adiciona `profiles.uf`, habilita o tipo `questionamento` e calcula um prazo de resposta de 15 dias corridos; ela precisa estar aplicada para o diretório, o cadastro e o acompanhamento de protocolos funcionarem integralmente.

A função serverless `frontend/VozCidada/api/representatives.ts` deve ser publicada na Vercel junto com o frontend. Após o deploy, confirme que `https://<dominio-do-site>/api/representatives` retorna representantes oficiais da Câmara e do Senado. O `vite.config.js` também disponibiliza esse endpoint localmente em `vite dev` e `vite preview`, evitando CORS durante o desenvolvimento.

Para OAuth e confirmação de cadastro por e-mail, siga a seção de autenticação em `frontend/VozCidada/supabase/SETUP.md`. Provedores sociais exigem credenciais e URLs de retorno configuradas no painel Supabase; não é suficiente publicar o frontend.
