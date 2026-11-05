require('pg'); 
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Servir pasta public estática (onde ficará o index.html)
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_curso_web_2026';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_OF3qaw9UtPzM@ep-cool-sound-b77x2cmg-pooler.c-13.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

// Conexão Sequelize via URL
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

// --- MODELOS ---
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'user' }, // 'user' ou 'admin'
  inscribed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Module = sequelize.define('Module', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT }
});

const Lesson = sequelize.define('Lesson', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  url: { type: DataTypes.STRING, allowNull: false } // YouTube ou Google Drive
});

const Material = sequelize.define('Material', {
  title: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false } // URL PDF
});

const Exercise = sequelize.define('Exercise', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT }
});

const Submission = sequelize.define('Submission', {
  answerText: { type: DataTypes.TEXT, allowNull: false },
  result: { type: DataTypes.STRING, defaultValue: 'Pendente' } // 'Pendente', 'Ruim', 'Normal', 'Excelente'
});

const Progress = sequelize.define('Progress', {
  completed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Associações
Module.hasMany(Lesson, { onDelete: 'CASCADE' });
Lesson.belongsTo(Module);

Module.hasMany(Exercise, { onDelete: 'CASCADE' });
Exercise.belongsTo(Module);

Module.hasMany(Material, { onDelete: 'CASCADE' });
Material.belongsTo(Module);

Exercise.hasMany(Submission, { onDelete: 'CASCADE' });
Submission.belongsTo(Exercise);

User.hasMany(Submission, { onDelete: 'CASCADE' });
Submission.belongsTo(User);

User.hasMany(Progress, { onDelete: 'CASCADE' });
Progress.belongsTo(User);

Lesson.hasMany(Progress, { onDelete: 'CASCADE' });
Progress.belongsTo(Lesson);

// Middleware de Autenticação JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// --- ROTAS DA API ---

// Auth: Cadastro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // Primeiro usuário registrado ou email específico pode ser admin automaticamente se desejar
    const count = await User.count();
    const role = (count === 0 || email.includes('admin')) ? 'admin' : 'user';
    const inscribed = role === 'admin' ? true : false;

    const user = await User.create({ name, email, password, role, inscribed });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, inscribed: user.inscribed } });
  } catch (e) {
    res.status(400).json({ error: 'Erro ao cadastrar, email já existe?' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, password } });
    if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, inscribed: user.inscribed } });
  } catch (e) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Perfil atual
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, inscribed: user.inscribed });
});

// Listar dados públicos da plataforma (Módulos, Aulas, Materiais, Exercícios)
app.get('/api/content', authenticateToken, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const modules = await Module.findAll({
    include: [Lesson, Material, Exercise]
  });
  const progress = await Progress.findAll({ where: { UserId: user.id } });
  const submissions = await Submission.findAll({ where: { UserId: user.id } });

  res.json({ user, modules, progress, submissions });
});

// --- ROTAS DO ADMIN (CRUD COMPLETO) ---
// Módulos
app.post('/api/admin/modules', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const mod = await Module.create(req.body);
  res.json(mod);
});
app.put('/api/admin/modules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Module.update(req.body, { where: { id: req.params.id } });
  res.json({ success: true });
});
app.delete('/api/admin/modules/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Module.destroy({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Aulas
app.post('/api/admin/lessons', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const lesson = await Lesson.create(req.body);
  res.json(lesson);
});
app.put('/api/admin/lessons/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Lesson.update(req.body, { where: { id: req.params.id } });
  res.json({ success: true });
});
app.delete('/api/admin/lessons/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Lesson.destroy({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Materiais
app.post('/api/admin/materials', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const mat = await Material.create(req.body);
  res.json(mat);
});
app.delete('/api/admin/materials/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Material.destroy({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Exercícios
app.post('/api/admin/exercises', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const ex = await Exercise.create(req.body);
  res.json(ex);
});
app.delete('/api/admin/exercises/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Exercise.destroy({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Alunos e Inscrições
app.get('/api/admin/students', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const students = await User.findAll({
    where: { role: 'user' },
    include: [Submission, Progress]
  });
  res.json(students);
});

app.patch('/api/admin/students/:id/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { inscribed } = req.body;
  await User.update({ inscribed }, { where: { id: req.params.id } });
  res.json({ success: true });
});

// Avaliar Submissão de Exercício
app.patch('/api/admin/submissions/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { result } = req.body; // 'Ruim', 'Normal', 'Excelente'
  await Submission.update({ result }, { where: { id: req.params.id } });
  res.json({ success: true });
});

// --- AÇÕES DO ALUNO ---
app.post('/api/student/submit-exercise', authenticateToken, async (req, res) => {
  const { ExerciseId, answerText } = req.body;
  const sub = await Submission.create({
    ExerciseId,
    UserId: req.user.id,
    answerText,
    result: 'Pendente'
  });
  res.json(sub);
});

app.post('/api/student/progress', authenticateToken, async (req, res) => {
  const { LessonId, completed } = req.body;
  let prog = await Progress.findOne({ where: { UserId: req.user.id, LessonId } });
  if (prog) {
    prog.completed = completed;
    await prog.save();
  } else {
    prog = await Progress.create({ UserId: req.user.id, LessonId, completed });
  }
  res.json(prog);
});

// Fallback para SPA (qualquer rota não definida retorna o index.html)
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sincronizar banco e iniciar servidor
sequelize.sync().then(() => {
  app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
  });
});