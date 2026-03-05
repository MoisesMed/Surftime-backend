const mongoose = require('mongoose');
const getDatabaseURI = require('../utils/getDatabaseURI');

async function setTentantContext(req, res, next) {
    try {
        const host = req.headers.host;
        const subdomain = host.split('.')[0];

        if (!subdomain) {
            return res.status(400).json({ message: 'Subdomain not found' });
        }

        //TODO: update to actually use the subdomain
        const tenantDatabaseURI = getDatabaseURI("surftimeapp_dosanjossurfschool");
        if (!tenantDatabaseURI) {
            return res.status(400).json({ message: 'Database URI not found' });
        }

        let tentantConnection = mongoose.connections.find(
             (connection) => connection.name === subdomain,
         );

         if (!tentantConnection) {
             tentantConnection = await mongoose.createConnection(
                 tenantDatabaseURI,
                 {
                     dbName: subdomain,
                 },
             );
         }

         req.tenantConnection = tentantConnection;
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
}

module.exports = setTentantContext;

