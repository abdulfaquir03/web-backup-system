const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (!token) {
    return res.status(401).json({
      status: false,
      expired: false,
      mensagem: 'Acesso negado. Token de autenticação não fornecido.',
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';
    const decoded = jwt.verify(token, jwtSecret);

    req.user = {
      id: decoded.id,
      code: decoded.type || decoded.code || '',
      type: decoded.type || decoded.code || '',
      ...decoded
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: false,
        expired: true,
        mensagem: 'Sua sessão expirou. Faça login novamente.',
      });
    }

    return res.status(403).json({
      status: false,
      expired: false,
      mensagem: 'Token inválido ou adulterado.',
    });
  }
};

module.exports = authMiddleware;