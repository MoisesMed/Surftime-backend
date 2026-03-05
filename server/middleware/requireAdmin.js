async function requireAdmin(req, res, next) {
    try {
        const { User } = req.models;
        console.log('req.userId:', req.user.id);
        const user = await User.findById(req.user.id);
    
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Acesso negado: privilégios de administrador são obrigatórios' });
        }
    
        next();
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message});
        console.error('Error in requireAdmin middleware:', error);
    }
}

module.exports = requireAdmin;
