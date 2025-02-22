function getMongoDatabaseURI(subdomain) {
    const baseMongoDBURI = process.env.MONGODB_BASE_URI;

    if (!baseMongoDBURI) {
        throw new Error('MONGODB_BASE_URI is not defined in the environment variables');
    }

    if (!subdomain) {
        throw new Error('subdomain is required to construct the MongoDB URI');
    }

    // Ensure the subdomain is URI-encoded to handle any special characters
    subdomain = encodeURIComponent(subdomain);

    // Check if the base URI already contains a database name
    const hasDatabaseName = baseMongoDBURI.split('/').length > 3;
    if (hasDatabaseName) {
        throw new Error('MONGODB_BASE_URI should not contain a database name');
    }

    return `${baseMongoDBURI}/${subdomain}?retryWrites=true&w=majority&appName=surftimeapp`;
}

module.exports = getMongoDatabaseURI