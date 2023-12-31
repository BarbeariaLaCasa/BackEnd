const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 3001;
const secretKey = process.env.SECRET_KEY || "chave-secreta-padrao";

const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "LaCasa",
  password: "Jorge33867522",
  port: 5432,
});

app.use(cors());
app.use(express.json());

app.listen(port, () => {
  console.log(`Servidor está rodando na porta ${port}`);
});

app.get("/barbeiros", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM barbeiros");
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nenhum barbeiro encontrado" });
    }
    const barbeiros = result.rows;
    res.json(barbeiros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/adicionar-barbeiro", async (req, res) => {
  const { nome, fotoperfil, email, telefone, senha, sobre, fotos_trabalhos } =
    req.body;
  const fotosTrabalhosJSON = JSON.stringify(fotos_trabalhos);

  try {
    const tipo_acesso = "barbeiro";
    const result = await pool.query(
      "INSERT INTO barbeiros (nome, fotoperfil, email, telefone, senha, tipo_acesso, sobre, fotos_trabalhos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [
        nome,
        fotoperfil,
        email,
        telefone,
        senha,
        tipo_acesso,
        sobre,
        fotosTrabalhosJSON,
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.delete("/barbeiros/:id", async (req, res) => {
  const barbeiroId = req.params.id;

  try {
    const checkBarbeiro = await pool.query(
      "SELECT * FROM barbeiros WHERE idbarbeiro = $1",
      [barbeiroId]
    );
    if (checkBarbeiro.rowCount === 0) {
      return res.status(404).json({ error: "Barbeiro não encontrado" });
    }

    await pool.query("DELETE FROM barbeiros WHERE idbarbeiro = $1", [
      barbeiroId,
    ]);
    res.json({ message: `Barbeiro com ID ${barbeiroId} excluído com sucesso` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/usuarios", async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;

    if (!nome || !email || !telefone || !senha) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    const tipo_acesso = "cliente";

    const senhaSemCriptografia = senha;

    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, telefone, senha, tipo_acesso) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nome, email, telefone, senhaSemCriptografia, tipo_acesso]
    );

    const novoUsuarioId = result.rows[0].idusuarios;
    res.status(201).json({
      id: novoUsuarioId,
      message: "Usuário cadastrado com sucesso",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/usuarios/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT nome FROM usuarios WHERE idusuarios = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { nome } = result.rows[0];
    res.json({ nome });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/usuarios/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const user = await pool.query("SELECT * FROM usuarios WHERE email = $1", [
      email,
    ]);

    if (!user.rows[0]) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (senha !== user.rows[0].senha) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const userId = user.rows[0].idusuarios;
    const tipoAcesso = user.rows[0].tipo_acesso;
    const token = jwt.sign({ userId, tipoAcesso }, secretKey, {
      expiresIn: "1h",
    });

    res.json({ token, userId, tipo_acesso: tipoAcesso });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/barbeiros/:id", async (req, res) => {
  try {
    const barbeiroId = req.params.id;

    const result = await pool.query(
      "SELECT * FROM barbeiros WHERE idbarbeiro = $1",
      [barbeiroId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Barbeiro não encontrado" });
    }

    const barbeiro = result.rows[0];
    const nomeDoBarbeiro = barbeiro.nome;

    res.json({ nome: nomeDoBarbeiro });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/barbeiros/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const barbeiro = await pool.query(
      "SELECT * FROM barbeiros WHERE email = $1",
      [email]
    );

    if (!barbeiro.rows[0]) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (senha !== barbeiro.rows[0].senha) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const barbeiroId = barbeiro.rows[0].idbarbeiro;
    const tipoAcesso = barbeiro.rows[0].tipo_acesso;
    const token = jwt.sign({ barbeiroId, tipoAcesso }, secretKey, {
      expiresIn: "1h",
    });

    res.json({ token, barbeiroId, tipo_acesso: tipoAcesso });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/administradores/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const administrador = await pool.query(
      "SELECT * FROM administradores WHERE email = $1",
      [email]
    );

    if (!administrador.rows[0]) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (senha !== administrador.rows[0].senha) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const administradorId = administrador.rows[0].idadministrador;
    const tipoAcesso = administrador.rows[0].tipo_acesso;
    const token = jwt.sign({ administradorId, tipoAcesso }, secretKey, {
      expiresIn: "1h",
    });

    res.json({ token, administradorId, tipo_acesso: tipoAcesso });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/administradores/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT nome FROM administradores WHERE idadministrador = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Administrador não encontrado" });
    }

    const { nome } = result.rows[0];
    res.json({ nome });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/buscar-titulo-inicial", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT tituloinicial FROM administradores"
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhum título inicial encontrado" });
    }

    const tituloInicial = result.rows[0].tituloinicial;
    res.json({ tituloInicial });
  } catch (error) {
    console.error("Erro ao buscar o título inicial:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/editar-titulo-inicial", async (req, res) => {
  const { novoTitulo } = req.body;

  try {
    const result = await pool.query(
      "UPDATE administradores SET tituloinicial = $1",
      [novoTitulo]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhum título inicial encontrado para editar" });
    }

    res.json({ mensagem: "Título inicial editado com sucesso" });
  } catch (error) {
    console.error("Erro ao editar o título inicial:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/buscar-descricao-inicial", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT descricao_inicial FROM administradores"
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhuma descrição inicial encontrado" });
    }

    const descricao = result.rows[0].descricao_inicial;
    res.json({ descricao });
  } catch (error) {
    console.error("Erro ao buscar o descrição inicial:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/editar-descricao-inicial", async (req, res) => {
  const { novaDescricao } = req.body;

  try {
    const result = await pool.query(
      "UPDATE administradores SET descricao_inicial = $1",
      [novaDescricao]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhuma descrição inicial encontrada para editar" });
    }

    res.json({ mensagem: "Descrição inicial editada com sucesso" });
  } catch (error) {
    console.error("Erro ao editar a descrição inicial:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/verificar-token", (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Token inválido" });
      }

      const userId = decoded.userId;
      res.json({ userId });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/agendamentos", async (req, res) => {
  try {
    const { cliente_id, barbeiro_id, hora, data, valor, forma_pagamento } =
      req.body;

    if (
      !cliente_id ||
      !barbeiro_id ||
      !hora ||
      !data ||
      !valor ||
      !forma_pagamento
    ) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    const status = "aguardando";

    const result = await pool.query(
      "INSERT INTO agendamentos (cliente_id, barbeiro_id, hora, data, valor, forma_pagamento, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [cliente_id, barbeiro_id, hora, data, valor, forma_pagamento, status]
    );

    const novoAgendamentoId = result.rows[0].id;
    res.status(201).json({
      id: novoAgendamentoId,
      message: "Agendamento salvo com sucesso",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/agendamentos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM agendamentos");

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nenhum agendamento encontrado" });
    }

    const agendamentos = result.rows;
    res.json(agendamentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/agendamentos/:id", async (req, res) => {
  const agendamentoId = req.params.id;

  try {
    const result = await pool.query(
      "SELECT * FROM agendamentos WHERE idagendamentos = $1",
      [agendamentoId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const agendamento = result.rows[0];
    res.json(agendamento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/agendamentos/usuario/:id", async (req, res) => {
  const clienteId = req.params.id;

  if (!clienteId) {
    return res.status(400).json({ error: "ID do cliente não fornecido" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM agendamentos WHERE cliente_id = $1",
      [clienteId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhum agendamento encontrado para este cliente" });
    }

    const agendamentos = result.rows;
    res.json(agendamentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/agendamentos/barbeiro/:id", async (req, res) => {
  const barbeiroId = req.params.id;

  if (!barbeiroId) {
    return res.status(400).json({ error: "ID do barbeiro não fornecido" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM agendamentos WHERE barbeiro_id = $1",
      [barbeiroId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhum agendamento encontrado para este barbeiro" });
    }

    const agendamentos = result.rows;
    res.json(agendamentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/agendamentos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { novoStatus } = req.body;

    if (novoStatus !== "aceito" && novoStatus !== "recusado") {
      return res.status(400).json({ error: "Novo status inválido" });
    }

    const result = await pool.query(
      "UPDATE agendamentos SET status = $1 WHERE idagendamentos = $2",
      [novoStatus, id]
    );

    if (result.rowCount === 1) {
      res.json({ message: `Agendamento ${novoStatus} com sucesso` });
    } else {
      res.status(404).json({ error: "Agendamento não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/agendamentos/aceito/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE agendamentos SET status = $1 WHERE idagendamentos = $2",
      ["aceito", id]
    );

    if (result.rowCount === 1) {
      res.json({ message: "Agendamento aceito com sucesso" });
    } else {
      res.status(404).json({ error: "Agendamento não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/agendamentos/recusado/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE agendamentos SET status = $1 WHERE idagendamentos = $2",
      ["recusado", id]
    );

    if (result.rowCount === 1) {
      res.json({ message: "Agendamento recusado com sucesso" });
    } else {
      res.status(404).json({ error: "Agendamento não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/servicos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM serviços");
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nenhum serviço encontrado" });
    }
    const servicos = result.rows;
    res.json(servicos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.put("/servicos/:id", async (req, res) => {
  const { id } = req.params;
  const { valor, duração, descricaoservico } = req.body;

  try {
    const result = await pool.query(
      "UPDATE serviços SET valor = $1, duração = $2, descricaoservico = $3 WHERE idserviço = $4",
      [valor, duração, descricaoservico, id]
    );

    if (result.rowCount === 1) {
      res.json({ message: "Serviço atualizado com sucesso" });
    } else {
      res.status(404).json({ error: "Serviço não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post("/adicionar-servico", async (req, res) => {
  const { nome, valor, duracao, descricaoServico } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO serviços (nome, valor, duração, descricaoServico) VALUES ($1, $2, $3, $4) RETURNING *",
      [nome, valor, duracao, descricaoServico]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.delete("/excluir-servico/:id", async (req, res) => {
  const servicoId = req.params.id;

  try {
    const result = await pool.query(
      "DELETE FROM serviços WHERE idserviço = $1 RETURNING *",
      [servicoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    res.json({
      message: "Serviço excluído com sucesso",
      deletedService: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/resumo-financeiro", async (req, res) => {
  try {
    const query = `
    SELECT 
    agendamentos.barbeiro_id,
    barbeiros.nome AS nomebarbeiro,
    COUNT(agendamentos.idagendamentos) as totalAgendamentos,
    AVG(agendamentos.valor) as mediaReceita,
    SUM(agendamentos.valor) as valorTotal,
    COUNT(*) FILTER (WHERE agendamentos.forma_pagamento = 'pix') as totalPix,
    COUNT(*) FILTER (WHERE agendamentos.forma_pagamento = 'cartao') as totalCartao,
    COUNT(*) FILTER (WHERE agendamentos.forma_pagamento = 'dinheiro') as totalDinheiro
    FROM agendamentos
    INNER JOIN barbeiros ON agendamentos.barbeiro_id = barbeiros.idbarbeiro
    WHERE agendamentos.status = 'aceito'
    GROUP BY agendamentos.barbeiro_id, barbeiros.nome
    `;

    const result = await pool.query(query);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Nenhum dado financeiro encontrado" });
    }

    const resumoFinanceiro = result.rows;

    res.json(resumoFinanceiro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.get("/servicos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM servicos");

    const servicosComTempo = result.rows.map((servico) => ({
      ...servico,
      tempoEstimado: temposEstimados[servico.nome.toLowerCase()] || 0,
    }));

    res.json(servicosComTempo);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});
