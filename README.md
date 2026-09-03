# Vital Vet

Sistema para gestão de clínica veterinária, com foco no cadastro de tutores, animais, veterinários e atendimentos.

## Visão geral

O Vital Vet foi pensado para facilitar o controle administrativo de uma clínica veterinária, centralizando informações de pacientes, responsáveis, profissionais e atendimentos realizados. A aplicação permite registrar e consultar dados importantes de forma simples, com uma interface web voltada para uso prático no dia a dia da operação.

## Funcionalidades principais

- Cadastro e gerenciamento de tutores
- Cadastro e gerenciamento de animais, também chamados de pacientes
- Vínculo entre animais e seus respectivos tutores
- Listagem, visualização, edição e exclusão de animais cadastrados
- Registro de veterinários
- Registro de atendimentos (vinculados a animal e veterinário)
- Associação de procedimentos aos atendimentos
- Visualização de procedimentos por atendimento

## AC 1: Cadastro de tutores

Na AC 1, o foco é a implementação do cadastro e do gerenciamento de tutores.
O sistema permite cadastrar, listar, pesquisar, visualizar, editar e excluir as
informações dos responsáveis pelos animais atendidos na clínica.

Durante o cadastro, o CPF do tutor é validado para evitar informações
inconsistentes ou duplicadas. A exclusão também considera os vínculos existentes
no sistema, impedindo a remoção de tutores que possuam animais relacionados.

## AC 2: Cadastro de animais

Na AC 2, o foco é a implementação do cadastro e do gerenciamento de animais,
também chamados de pacientes. O sistema permite cadastrar, listar, visualizar,
editar e excluir animais, mantendo cada paciente vinculado ao seu respectivo
tutor.

Na visualização dos detalhes de um paciente, também é possível acessar as
informações do tutor relacionado. Essa integração facilita a consulta dos dados
dos responsáveis durante o atendimento da clínica.

## Requisitos

Antes de rodar o projeto, certifique-se de ter instalado:

- Node.js 18 ou superior
- PostgreSQL
- npm

## Como executar

1. Abra o terminal na pasta `backend`
2. Instale as dependências:

```bash
npm install
```

3. Crie um arquivo `.env` com a configuração do banco:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/vitalvet
PORT=3000
```

4. Crie o banco e execute o schema SQL:

```bash
psql -d vitalvet -f ../database/schema.sql
```

5. Inicie o servidor:

```bash
npm start
```

A aplicação ficará disponível em:

- Frontend: http://localhost:3000/
- API de teste: http://localhost:3000/ping
- Teste de banco: http://localhost:3000/dbtest

## Estrutura do projeto

```text
Projeto/
├── backend/
│   ├── scripts/
│   │   └── apply-database-permissions.js
│   ├── database_permissions.sql
│   ├── db.js
│   ├── package.json
│   ├── routes_animal.js
│   ├── routes_tutor.js
│   ├── routes_veterinaria.js
│   └── server.js
├── database/
│   └── schema.sql
├── frontend/
│   ├── atendimentos.html
│   ├── cadastro_animal.html
│   ├── cadastro_tutor.html
│   ├── cadastro_veterinario.html
│   ├── detalhes_animal.html
│   ├── detalhes_tutor.html
│   ├── editar_animal.html
│   ├── editar_tutor.html
│   ├── index.html
│   ├── listagem_animal.html
│   ├── listagem_tutor.html
│   ├── procedimentos.html
│   ├── script.js
│   ├── style.css
│   └── total_procedimentos.html
├── README.md
└── .vscode/
```

## Detalhes técnicos

### Stack tecnológica

- Node.js
- Express
- PostgreSQL
- pg
- dotenv
- CORS
- HTML, CSS e JavaScript

### Backend

A API fica na pasta `backend` e é iniciada pelo arquivo `server.js`.

Principais arquivos:

- `backend/server.js` — inicia o servidor Express e serve o frontend
- `backend/db.js` — conexão com o PostgreSQL via `pg`
- `backend/routes_animal.js` — rotas de CRUD para animais
- `backend/routes_tutor.js` — rotas de CRUD para tutores
- `backend/routes_veterinaria.js` — rotas de veterinários, procedimentos e atendimentos
- `backend/database_permissions.sql` — ajustes de permissões do banco

### Frontend

A interface web fica em `frontend` e é servida diretamente pelo backend. A página principal é `frontend/index.html`.

As páginas relacionadas ao gerenciamento de pacientes são:

- `frontend/cadastro_animal.html` — cadastro de novos animais
- `frontend/listagem_animal.html` — listagem dos pacientes cadastrados
- `frontend/detalhes_animal.html` — visualização dos dados do paciente e de seu tutor
- `frontend/editar_animal.html` — alteração dos dados do paciente

### Banco de dados

O schema principal está em `database/schema.sql` e define as tabelas:

- `tutor` — tutores dos animais
- `animal` — animais cadastrados (pacientes)
- `veterinario` — veterinários responsáveis pelos atendimentos
- `procedimento` — catálogo de procedimentos e serviços
- `atendimento` — atendimentos realizados (vinculam animal e veterinário)
- `atendimento_procedimento` — procedimentos associados a cada atendimento

### Endpoints principais
Tutores

Animais

Veterinários

Atendimentos e Procedimentos

Total a Pagar

### Observações

- O backend também serve os arquivos estáticos do frontend.
- A aplicação usa respostas em JSON para comunicação com a API.
- O projeto é estruturado como uma solução acadêmica/protótipo de gestão veterinária.

## Licença

Este projeto não apresenta arquivo de licença explícito no repositório, sendo indicado como material de estudo e desenvolvimento local.

## Autor

Projeto acadêmico desenvolvido para gestão de atendimentos veterinários com backend em Node.js e banco PostgreSQL.