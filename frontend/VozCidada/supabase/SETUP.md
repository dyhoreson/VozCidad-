# Conectar o frontend ao Supabase

1. No painel do Supabase, abra **SQL Editor** e execute `schema.sql`.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave publishable/anon). Reinicie o Vite depois de alterar variáveis.
3. Cadastre representantes pelos fluxos do Supabase Auth. O trigger cria um registro em `profiles` com papel `cidadao`.
4. Para autorizar uma conta institucional, localize o UUID do usuário em **Authentication → Users** e ajuste o perfil no SQL Editor. Exemplo:

```sql
update public.profiles
set role = 'empresa', sector = 'Água e saneamento', municipio = 'Natal'
where id = 'UUID-DO-USUARIO';
```

Use `role = 'politico'` para representantes e `role = 'admin'` somente para administradores confiáveis. O cliente web nunca deve receber `service_role`.

Denúncias são atribuídas automaticamente a uma conta `empresa` cujo `sector` corresponda à categoria e cujo município corresponda ao da denúncia (ou esteja vazio). Votos são agregados pela view `bill_vote_totals`, que não expõe a identidade dos votantes. Protocolos e anexos permanecem visíveis apenas ao remetente e ao destinatário.

`schema.sql` inclui as políticas RLS e os buckets de arquivos. Configure os provedores OAuth no painel antes de habilitar Google, Apple ou Microsoft. Contas oficiais, projetos e categorias precisam ser cadastrados no banco; o SQL não importa os antigos dados demonstrativos.
