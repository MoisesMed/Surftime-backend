const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function validateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Não autorizado' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log(err);
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

module.exports = validateToken;

