-- Criação das tabelas

CREATE TABLE IF NOT EXISTS tutor (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  telefone VARCHAR(20),
  endereco VARCHAR(200),
  data_nascimento DATE
);

CREATE TABLE IF NOT EXISTS animal (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  data_nascimento DATE,
  especie VARCHAR(5),
  raca VARCHAR(50),
  cor VARCHAR(50),
  peso_kg NUMERIC(5,2),
  tutor_id INT REFERENCES tutor(id)
);

CREATE TABLE IF NOT EXISTS veterinario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  especialidade VARCHAR(100),
  crmv VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS servico (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  categoria VARCHAR(50),
  valor NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS atendimento (
  id SERIAL PRIMARY KEY,
  animal_id INT REFERENCES animal(id),
  veterinario_id INT REFERENCES veterinario(id),
  data DATE NOT NULL,
  hora TIME,
  observacoes TEXT,
  valor_total NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS atendimento_servico (
  id SERIAL PRIMARY KEY,
  atendimento_id INT REFERENCES atendimento(id) ON DELETE CASCADE,
  servico_id INT REFERENCES servico(id),
  valor NUMERIC(10,2) NOT NULL
);