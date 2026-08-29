const API_URL = 'http://localhost:3000';

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

const cpfInput = document.getElementById('cpf');
const telefoneInput = document.getElementById('telefone');
const formTutor = document.getElementById('formTutor');

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
			console.error('Erro ao cadastrar tutor:', error);
			const mensagem = error instanceof TypeError && error.message === 'Failed to fetch'
				? 'Nao foi possivel conectar a API. Inicie o backend na porta 3000 e tente novamente.'
				: error.message;
			alert(`Erro ao cadastrar tutor: ${mensagem}`);
		}
	});
}
