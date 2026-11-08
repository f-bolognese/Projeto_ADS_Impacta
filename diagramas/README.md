# Diagramas do Vital Vet

Os arquivos `.mmd` são os fontes Mermaid dos diagramas do projeto.

## Arquivos

- `diagrama-classes.mmd`: modelo das entidades, associações e regras financeiras.
- `diagrama-casos-de-uso.mmd`: ações disponíveis ao usuário da clínica.

## Visualização

Os arquivos podem ser visualizados diretamente em ferramentas que suportem Mermaid, como o preview Markdown do VS Code ou GitHub.

Para entregar uma representação gráfica, exporte cada fonte como PNG ou SVG e use essa imagem na documentação, apresentação ou documento Word/PDF.

## Escopo representado

- Cadastro e manutenção de tutores, animais, veterinários e serviços.
- Cadastro, consulta, edição e exclusão de atendimentos.
- Associação de serviços aos atendimentos.
- Valor de cada serviço registrado no momento da associação.
- Cálculo automático do valor total pela soma dos serviços aplicados.
- Seleção da agenda diária por data.
- Status único por atendimento: `a_pagar` ou `pago`.
- Fechamento diário derivado dos atendimentos da data; não é uma tabela persistida.
- Bloqueio de alterações financeiras, serviços e exclusão após pagamento confirmado.
- Cálculo especial da aplicação de medicação para gatos e cães conforme o peso.
