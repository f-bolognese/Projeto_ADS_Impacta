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
- Cadastro, listagem, detalhes, edição e exclusão de serviços
- Associação de serviços aos atendimentos, com valor registrado no momento do vínculo
- Remoção ou substituição de um serviço aplicado incorretamente em um atendimento
- Visualização dos serviços e do total por atendimento
- Consulta da agenda e do fechamento financeiro por data
- Bloqueio de edição, exclusão e alteração de serviços em atendimentos pagos
- Cálculo de aplicação de medicação por espécie e peso

## Diagramas do sistema

Os diagramas UML do projeto estão disponíveis na pasta [diagramas](diagramas/README.md):

- [Diagrama de classes](diagramas/diagrama-classes.mmd)
- [Diagrama de casos de uso](diagramas/diagrama-casos-de-uso.mmd)

## AC 1: Cadastro de tutores

Na AC 1, o foco é a implementação do cadastro e do gerenciamento de tutores.
O sistema permite cadastrar, listar, pesquisar, visualizar, editar e excluir as
informações dos responsáveis pelos animais atendidos na clínica.

Durante o cadastro, o CPF do tutor é validado e normalizado para conter 11 dígitos.
O backend verifica duplicidade quando uma constraint de banco está disponível. A
exclusão considera os vínculos existentes e impede a remoção de tutores que possuam
animais relacionados.

## AC 2: Cadastro de animais

Na AC 2, o foco é a implementação do cadastro e do gerenciamento de animais,
também chamados de pacientes. O sistema permite cadastrar, listar, visualizar,
editar e excluir animais, mantendo cada paciente vinculado ao seu respectivo
tutor.

Na visualização dos detalhes de um paciente, também é possível acessar as
informações do tutor relacionado. Essa integração facilita a consulta dos dados
dos responsáveis durante o atendimento da clínica.

## AC 3: Veterinários, serviços e atendimentos

Na AC 3, o foco é ampliar o gerenciamento da clínica com o cadastro e a
administração de veterinários e serviços, além do registro de atendimentos
vinculados a pacientes e veterinários. O sistema permite cadastrar, listar,
visualizar, editar e excluir esses registros, bem como associar serviços aos
atendimentos.

Caso um serviço seja associado incorretamente, é possível substituí-lo no próprio
atendimento, sem criar outro registro de atendimento. Assim, os demais dados da
consulta são mantidos. O total é recalculado pela soma dos valores associados.

Para a categoria de aplicação de medicação, o valor é calculado automaticamente:
R$ 35,00 para gatos; para cães, R$ 35,00 até 10 kg, R$ 45,00 até 20 kg,
R$ 55,00 até 35 kg e R$ 65,00 acima de 35 kg. Outras espécies não têm esse valor calculado.

## AC 4: Fechamento financeiro dos atendimentos

A AC 4 implementa o controle financeiro diário dos atendimentos. Cada atendimento
possui status `pago` ou `a_pagar`; o status pode ser alterado na listagem ou nos
detalhes. O valor continua sendo recalculado pela soma dos serviços vinculados.

A página `total_procedimentos.html` consulta os atendimentos de uma data e permite
selecionar cada registro para visualizar seus serviços, valores e status. A API
também disponibiliza o resumo diário por data com total geral, total pago, total
pendente e quantidade de atendimentos em cada situação.

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

Para atualizar um banco existente e permitir valores nulos no catálogo de serviços:

```bash
psql -d vitalvet -f ../database/allow_nullable_service_value.sql
```

Para adicionar o status de pagamento ao banco existente, execute como usuário proprietário da tabela `atendimento`:

```bash
psql -d vitalvet -f ../database/add_payment_status.sql
```

5. Conceda as permissões do banco ao usuário da aplicação (como proprietário das tabelas ou administrador):

```bash
psql -d vitalvet -f database_permissions.sql
```

6. Inicie o servidor:

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
│   ├── grant_servico_permissions.sql
│   ├── db.js
│   ├── package.json
│   ├── routes_animal.js
│   ├── routes_atendimento.js
│   ├── routes_servico.js
│   ├── routes_tutor.js
│   ├── routes_veterinaria.js
│   └── server.js
├── database/
│   ├── add_payment_status.sql
│   ├── allow_nullable_service_value.sql
│   └── schema.sql
├── frontend/
│   ├── atendimentos.html
│   ├── cadastro_animal.html
│   ├── cadastro_atendimento.html
│   ├── cadastro_servico.html
│   ├── cadastro_tutor.html
│   ├── cadastro_veterinario.html
│   ├── detalhes_animal.html
│   ├── detalhes_atendimento.html
│   ├── detalhes_servico.html
│   ├── detalhes_tutor.html
│   ├── detalhes_veterinario.html
│   ├── editar_animal.html
│   ├── editar_atendimento.html
│   ├── editar_servico.html
│   ├── editar_tutor.html
│   ├── editar_veterinario.html
│   ├── index.html
│   ├── listagem_animal.html
│   ├── listagem_atendimento.html
│   ├── listagem_servico.html
│   ├── listagem_tutor.html
│   ├── listagem_veterinario.html
│   ├── servicos.html
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
- `backend/routes_atendimento.js` — rotas de atendimentos e serviços associados
- `backend/routes_servico.js` — rotas de CRUD para serviços
- `backend/routes_tutor.js` — rotas de CRUD para tutores
- `backend/routes_veterinaria.js` — rotas de veterinários
- `backend/database_permissions.sql` — ajustes de permissões do banco

### Frontend

A interface web fica em `frontend` e é servida diretamente pelo backend. A página principal é `frontend/index.html`.

As páginas relacionadas ao gerenciamento de pacientes são:

- `frontend/cadastro_animal.html` — cadastro de novos animais
- `frontend/listagem_animal.html` — listagem dos pacientes cadastrados
- `frontend/detalhes_animal.html` — visualização dos dados do paciente e de seu tutor
- `frontend/editar_animal.html` — alteração dos dados do paciente

As páginas de veterinários, serviços e atendimentos seguem o mesmo fluxo de
cadastro, listagem, detalhes e edição. Em `frontend/detalhes_atendimento.html`,
também é possível adicionar, remover ou substituir serviços associados ao
atendimento.

### Banco de dados

O schema principal está em `database/schema.sql` e define as tabelas:

- `tutor` — tutores dos animais
- `animal` — animais cadastrados (pacientes)
- `veterinario` — veterinários responsáveis pelos atendimentos
- `servico` — catálogo de serviços
- `atendimento` — atendimentos realizados (vinculam animal e veterinário)
- `atendimento_servico` — serviços associados a cada atendimento e valor cobrado

### Endpoints principais

- `/tutores` — cadastro e gerenciamento de tutores
- `/animais` — cadastro e gerenciamento de pacientes
- `/veterinarios` — cadastro e gerenciamento de veterinários
- `/servicos` — cadastro e gerenciamento de serviços
- `/atendimentos` — registro, consulta e gerenciamento de atendimentos
- `/atendimentos?data=YYYY-MM-DD` — agenda de atendimentos por data
- `/atendimentos/resumo-diario?data=YYYY-MM-DD` — totais e quantidades por status em uma data
- `/atendimentos/:id/pagamento` — alteração do status de pagamento
- `/atendimentos/:id/servicos` — associação, consulta, substituição e remoção de serviços de um atendimento

### Observações

- O backend também serve os arquivos estáticos do frontend.
- A aplicação usa respostas em JSON para comunicação com a API.
- O projeto é estruturado como uma solução acadêmica/protótipo de gestão veterinária.

## Licença

Este projeto não apresenta arquivo de licença explícito no repositório, sendo indicado como material de estudo e desenvolvimento local.

## Autora

Projeto acadêmico desenvolvido para gestão de atendimentos veterinários com backend em Node.js e banco PostgreSQL.
