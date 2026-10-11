# Serviço de acessibilidade para leis

API FastAPI que produz explicações em linguagem simples, perguntas frequentes e
texto para leitura em voz alta usando o modelo Gemini 3.8 Flash pela Interactions
API. A chave Gemini é lida somente do ambiente do servidor e nunca deve ser
enviada ao frontend.

## Executar localmente

```powershell
cd ai-service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Preencha GEMINI_API_KEY no arquivo .env
uvicorn main:app --reload --port 8000
```

O endpoint `POST /analisar-projeto` recebe JSON como:

```json
{
  "titulo": "Exemplo de proposta",
  "texto_original": "Texto integral ou ementa que será explicado.",
  "modo": "resumido"
}
```

`modo` aceita `resumido` e `completo`. A resposta inclui `resumo_didatico`,
`perguntas_frequentes`, `analise_completa` e `texto_para_voz`.
O endpoint legado `POST /analyze` continua disponível para clientes antigos.
As interações são enviadas com `store=false` para não manter o conteúdo dos
projetos no histórico remoto da API. Para reduzir a espera, o serviço usa baixo
esforço de raciocínio e limita o tamanho das respostas; o frontend aguarda até
dois minutos para acomodar o tempo de inicialização da instância gratuita após
um período sem uso.

Configure `VITE_AI_SERVICE_URL` no frontend para apontar à URL publicada desta
API. Em produção, ajuste `FRONTEND_ORIGINS` para os domínios exatos do portal.
Não habilite origens curingas com credenciais nem registre textos de documentos,
chaves ou respostas que possam conter dados pessoais nos logs.
Antes de disponibilizar publicamente, configure autenticação e limite de
requisições no gateway/host para evitar uso indevido e cobranças inesperadas.

O serviço explica apenas o texto recebido. A interface atual fornece a ementa e
o resumo cadastrados para cada projeto; o PDF vinculado continua disponível para
consulta, mas não é baixado nem interpretado automaticamente por esta API.
