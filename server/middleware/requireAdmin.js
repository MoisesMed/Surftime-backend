const User = require('../models/User');

async function requireAdmin(req, res, next) {
    try {
        console.log('req.userId:', req.user.id);
        const user = await User.findById(req.user.id);
    
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Access denied because Admin priviledges are required' });
        }
    
        next();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message});
        console.error('Error in requireAdmin middleware:', error);
    }
}

module.exports = requireAdmin;
