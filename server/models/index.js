const modelDefs = [
  require('./User'),
  require('./InstructorProfile'),
  require('./StudentProfile'),
  require('./School'),
  require('./Lesson'),
  require('./Feedback'),
];

function getModels(conn) {
  const models = {};
  for (const def of modelDefs) {
    models[def.name] = conn.models[def.name] || conn.model(def.name, def.schema);
  }
  return models;
}

module.exports = { getModels };
