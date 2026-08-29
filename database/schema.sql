-- Criação das tabelas

CREATE TABLE IF NOT EXISTS tutor (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  telefone VARCHAR(20),
  endereco VARCHAR(200),
  data_nascimento DATE,
  email VARCHAR(255)
);

ALTER TABLE public.tutor
  ALTER COLUMN cpf TYPE VARCHAR(14);

ALTER TABLE public.tutor
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE TABLE IF NOT EXISTS animal (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  data_nascimento DATE,
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

CREATE TABLE IF NOT EXISTS procedimento (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  categoria VARCHAR(50),
  valor NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS atendimento (
  id SERIAL PRIMARY KEY,
  animal_id INT REFERENCES animal(id),
  veterinario_id INT REFERENCES veterinario(id),
  data DATE,
  hora TIME
);

CREATE TABLE IF NOT EXISTS atendimento_procedimento (
  id SERIAL PRIMARY KEY,
  atendimento_id INT REFERENCES atendimento(id),
  procedimento_id INT REFERENCES procedimento(id)
);