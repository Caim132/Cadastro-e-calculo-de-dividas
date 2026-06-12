# Controle de Dívidas

Um aplicativo web simples para cadastrar clientes, registrar dívidas e calcular o valor atualizado com juros compostos anuais.

A ideia é manter o projeto fácil de entender, fácil de rodar e seguro para publicar no GitHub.

Ele usa **Supabase** como banco de dados, então os dados ficam salvos em um PostgreSQL online, com login por usuário.

---

## O que o app faz

- Cadastro de clientes
- Cadastro de dívidas por cliente
- Cálculo com juros compostos anuais
- Relatório individual por cliente
- Total geral atualizado
- Login por email e senha
- Dados separados por usuário
- Banco PostgreSQL via Supabase
- Segurança com Row Level Security

---

## Como o cálculo funciona

O cálculo usa juros compostos proporcionais ao tempo:

```txt
valor_atualizado = valor_inicial × (1 + juros_anual) ^ anos
```

Exemplo:

```txt
R$ 1.000,00 a 12% ao ano por 2 anos
1000 × (1 + 0.12)² = R$ 1.254,40
```

O app calcula os anos com base na diferença de dias entre a data inicial da dívida e a data escolhida no relatório.

---

## Observação importante

O Banco do Brasil, ou qualquer outro banco, não usa uma taxa anual única para todas as dívidas.

A taxa correta deve vir do contrato da operação: empréstimo, financiamento, cartão, renegociação etc.

A opção de Selic no app é apenas uma referência para preenchimento. Ela não substitui a taxa contratual.

---

## Estrutura do projeto

```txt
controle-dividas-supabase/
├── index.html
├── assets/
│   ├── app.js
│   ├── config.example.js
│   └── styles.css
├── supabase/
│   └── schema.sql
├── .gitignore
├── LICENSE
└── README.md
```

O arquivo `assets/config.js` **não vai para o GitHub**.

Ele deve ser criado localmente a partir do `assets/config.example.js`.

Isso evita que a URL e a chave pública do seu Supabase fiquem expostas no repositório.

---

## Como usar

### 1. Criar um projeto no Supabase

Crie uma conta no Supabase e crie um novo projeto.

Depois que o projeto estiver pronto, você vai precisar de duas informações:

- **Project URL**
- **anon public key** ou **publishable key**

Elas ficam em:

```txt
Project Settings → API
```

ou, dependendo da interface:

```txt
Project Settings → API Keys
```

A URL normalmente se parece com:

```txt
https://xxxxxxxxxxxx.supabase.co
```

---

### 2. Criar as tabelas

No painel do Supabase:

1. Abra seu projeto
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Cole o conteúdo do arquivo `supabase/schema.sql`
5. Clique em **Run**

Esse script cria as tabelas:

- `clientes`
- `dividas`

E também ativa as regras de segurança para que cada usuário veja apenas os próprios dados.

---

### 3. Criar o arquivo de configuração local

Na pasta `assets`, copie o arquivo:

```txt
config.example.js
```

E renomeie a cópia para:

```txt
config.js
```

No Linux/macOS:

```bash
cp assets/config.example.js assets/config.js
```

No Windows, você pode copiar e colar o arquivo manualmente.

Depois abra `assets/config.js` e preencha com seus dados do Supabase:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA_CHAVE_PUBLICA_DO_SUPABASE",
  DEFAULT_SELIC_PERCENT: 10.5
};
```

Use apenas a chave pública do Supabase.

Nunca coloque a chave `service_role` nesse arquivo.

---

### 4. Rodar o app

Você pode abrir o `index.html` direto no navegador.

Mas a forma mais confiável é rodar um servidor local simples.

Com Python instalado:

```bash
python -m http.server 8000
```

Depois abra:

```txt
http://localhost:8000
```

---

## Publicando no GitHub

Antes de subir para o GitHub, confira que o arquivo real de configuração não está sendo enviado.

Este projeto já tem no `.gitignore`:

```txt
assets/config.js
```

Então o GitHub deve receber apenas:

```txt
assets/config.example.js
```

Assim, quem baixar o projeto cria o próprio `config.js` com os dados do próprio Supabase.

---

## Publicando no GitHub Pages

Este app é estático, então pode ser publicado no GitHub Pages.

Passos básicos:

1. Suba o projeto para um repositório no GitHub
2. Vá em **Settings**
3. Entre em **Pages**
4. Em **Build and deployment**, escolha:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Salve

Atenção: no GitHub Pages o arquivo `assets/config.js` não estará no repositório se você mantiver ele ignorado.

Para publicar em produção, você tem duas opções:

### Opção A — manter simples

Você cria um `config.js` específico para produção antes de publicar.

Como a chave usada é pública, isso é aceitável desde que:

- seja a chave `anon public` ou `publishable`;
- o Row Level Security esteja ativo;
- a chave `service_role` nunca seja usada no frontend.

### Opção B — usar uma plataforma com variáveis de ambiente

Para algo mais profissional, publique em uma plataforma como Vercel, Netlify ou Cloudflare Pages e gere o arquivo de configuração durante o build.

---

## Segurança

Este projeto usa Row Level Security no Supabase.

A regra principal é:

```sql
owner_id = auth.uid()
```

Na prática:

- um usuário não vê clientes de outro usuário;
- um usuário não vê dívidas de outro usuário;
- a chave pública pode ser usada no frontend;
- a chave `service_role` nunca deve aparecer no código do navegador.

---

## Problemas comuns

### “Failed to fetch”

Normalmente é uma destas coisas:

- URL do Supabase incorreta
- URL sem `https://`
- chave pública errada
- projeto Supabase pausado
- arquivo `assets/config.js` não foi criado
- app aberto como `file://` e o navegador bloqueou a requisição

Tente rodar assim:

```bash
python -m http.server 8000
```

E abra:

```txt
http://localhost:8000
```

---

### “Invalid login credentials”

Email ou senha incorretos.

---

### Conta criada, mas não entra

Se a confirmação por email estiver ativa no Supabase, você precisa confirmar o email antes de fazer login.

Para alterar isso:

```txt
Supabase → Authentication → Providers → Email
```

---

## Próximas melhorias possíveis

Algumas ideias para evoluir o projeto:

- edição de clientes
- edição de dívidas
- busca por CPF
- histórico de pagamentos
- abatimento parcial da dívida
- cálculo com juros mensais
- exportação em PDF
- dashboard com gráficos
- atualização automática da Selic via API

---

## Licença

Este projeto está sob a licença MIT.

Você pode usar, modificar e adaptar conforme sua necessidade.
