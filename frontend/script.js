const API_URL = 'http://localhost:3000';

/* ============================
   Máscaras de CPF e Telefone
============================ */
function formatCpf(value) {
  let digits = value.replace(/\D/g, '').slice(0, 11);
  digits = digits.replace(/(\d{3})(\d)/, '$1.$2');
  digits = digits.replace(/(\d{3})(\d)/, '$1.$2');
  return digits.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatTelefone(value) {
  let digits = value.replace(/\D/g, '').slice(0, 11);
  digits = digits.replace(/^(\d{2})(\d)/, '($1) $2');
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

/* ============================
   Elementos do Tutor
============================ */
const cpfInput = document.getElementById('cpf');
const telefoneInput = document.getElementById('telefone');
const formTutor = document.getElementById('formTutor');

/* ============================
   Máscara de Peso (Animal)
============================ */
const pesoInput = document.getElementById('peso_kg');

if (pesoInput) {
  pesoInput.addEventListener('input', () => {
    const pos = pesoInput.selectionStart;

    let v = pesoInput.value.replace(/[^\d,]/g, '');

    const partes = v.split(',');
    if (partes.length > 2) {
      v = partes[0] + ',' + partes[1];
    }

    if (partes[0].length > 2) {
      partes[0] = partes[0].slice(0, 2);
    }

    if (partes[1] && partes[1].length > 3) {
      partes[1] = partes[1].slice(0, 3);
    }

    pesoInput.value = partes.join(',');

    const newPos = pos + (pesoInput.value.length - v.length);
    pesoInput.selectionStart = pesoInput.selectionEnd = newPos;
  });
}

/* ============================
   Cadastro de Tutor
============================ */
if (cpfInput && telefoneInput && formTutor) {
  cpfInput.addEventListener('input', () => {
    cpfInput.value = formatCpf(cpfInput.value);
  });

  telefoneInput.addEventListener('input', () => {
    telefoneInput.value = formatTelefone(telefoneInput.value);
  });

  document.getElementById('voltar').onclick = () => {
    window.location.href = 'listagem_tutor.html';
  };

  formTutor.addEventListener('submit', async (event) => {
    event.preventDefault();

    const tutor = {
      nome: document.getElementById('nome').value.trim(),
      cpf: cpfInput.value,
      telefone: telefoneInput.value,
      endereco: document.getElementById('endereco').value.trim(),
      email: document.getElementById('email').value.trim(),
      data_nascimento: document.getElementById('data_nascimento').value || null
    };

    try {
      const response = await fetch(`${API_URL}/tutores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tutor)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Nao foi possivel cadastrar o tutor.');
      }

      alert('Tutor cadastrado com sucesso!');
      window.location.href = 'listagem_tutor.html';
    } catch (error) {
      const mensagem =
        error instanceof TypeError && error.message === 'Failed to fetch'
          ? 'Nao foi possivel conectar a API. Inicie o backend na porta 3000 e tente novamente.'
          : error.message;

      alert(`Erro ao cadastrar tutor: ${mensagem}`);
    }
  });
}

/* ============================
   Autocomplete de Tutor no Cadastro de Animal
============================ */
async function carregarTutoresParaAnimal() {
  const inputNome = document.getElementById('tutor_nome');
  const inputId = document.getElementById('tutor_id');
  const lista = document.getElementById('autocomplete_tutores');

  if (!inputNome || !inputId || !lista) return;

  let tutores = [];

  try {
    const resposta = await fetch(`${API_URL}/tutores`);
    tutores = await resposta.json();
  } catch (error) {
    alert('Erro ao carregar tutores: ' + error.message);
    return;
  }

  inputNome.addEventListener('input', () => {
    const texto = inputNome.value.toLowerCase();
    lista.innerHTML = '';

    if (!texto.trim()) {
      inputId.value = '';
      return;
    }

    const filtrados = tutores.filter(t =>
      t.nome.toLowerCase().includes(texto)
    );

    filtrados.forEach(t => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = `${t.nome} (ID: ${t.id})`;

      item.onclick = () => {
        inputNome.value = t.nome;
        inputId.value = t.id;
        lista.innerHTML = '';
      };

      lista.appendChild(item);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-container')) {
      lista.innerHTML = '';
    }
  });
}

carregarTutoresParaAnimal();

/* ============================
   Cadastro de Animal
============================ */
const formAnimal = document.getElementById('formAnimal');

if (formAnimal) {
  document.getElementById('voltar').onclick = () => {
    window.location.href = 'listagem_animal.html';
  };

  formAnimal.addEventListener('submit', async (event) => {
    event.preventDefault();

    const animal = {
      nome: document.getElementById('nome').value.trim(),
      especie: document.getElementById('especie').value,
      raca: document.getElementById('raca').value.trim(),
      cor: document.getElementById('cor').value.trim(),
      peso_kg: document.getElementById('peso_kg').value.replace(',', '.') || null,
      data_nascimento: document.getElementById('data_nascimento').value || null,
      tutor_id: Number(document.getElementById('tutor_id').value)
    };

    try {
      const response = await fetch(`${API_URL}/animais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(animal)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível cadastrar o animal.');
      }

      alert('Animal cadastrado com sucesso!');
      window.location.href = 'listagem_animal.html';

    } catch (error) {
      alert('Erro ao cadastrar animal: ' + error.message);
    }
  });
}

/* ============================
   LISTAGEM DE ANIMAIS — PADRÃO TUTORES
============================ */
async function carregarAnimais() {
  const tabela = document.querySelector('#tabelaAnimais tbody');
  const botaoNovo = document.getElementById('novoPaciente');

  if (!tabela || !botaoNovo) return;

  botaoNovo.onclick = () => {
    window.location.href = 'cadastro_animal.html';
  };

  try {
    const resposta = await fetch(`${API_URL}/animais`);
    const animais = await resposta.json();

    if (!resposta.ok) {
      throw new Error(animais.error || 'Não foi possível carregar os pacientes.');
    }

    tabela.innerHTML = '';

    animais.forEach(a => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${a.id}</td>
        <td>${a.nome}</td>
        <td>${a.especie}</td>
        <td>${a.raca || '-'}</td>
        <td>${a.cor || '-'}</td>
        <td>${a.peso_kg ? a.peso_kg.toString().replace('.', ',') : '-'}</td>
        <td>${a.tutor_id}</td>

        <td class="acoes">
          <button class="detalhes" data-id="${a.id}">
            <span class="material-icons">visibility</span>
            Detalhar
          </button>

          <button class="editar" data-id="${a.id}">
            <span class="material-icons">edit</span>
            Editar
          </button>

          <button class="excluir" data-id="${a.id}">
            <span class="material-icons">delete</span>
            Excluir
          </button>
        </td>
      `;

      tabela.appendChild(tr);
    });

    document.querySelectorAll('.detalhes').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        window.location.href = `detalhes_animal.html?id=${id}`;
      };
    });

    document.querySelectorAll('.editar').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        window.location.href = `editar_animal.html?id=${id}`;
      };
    });

    document.querySelectorAll('.excluir').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;

        if (!confirm('Deseja realmente excluir este paciente?')) return;

        try {
          const resposta = await fetch(`${API_URL}/animais/${id}`, {
            method: 'DELETE'
          });

          const result = await resposta.json();

          if (!resposta.ok) {
            throw new Error(result.error || 'Não foi possível excluir.');
          }

          alert('Paciente excluído com sucesso!');
          carregarAnimais();

        } catch (error) {
          alert('Erro ao excluir paciente: ' + error.message);
        }
      };
    });

  } catch (error) {
    alert('Erro ao carregar pacientes: ' + error.message);
  }
}

carregarAnimais();