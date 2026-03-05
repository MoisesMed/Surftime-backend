async function getSchoolObject(models) {
  try {
    const { School } = models;
    console.log('[getSchoolObject] model dbName:', School.db?.name);
    const school = await School.findOne();

    if (!school) {
      throw new Error('School not found');
    }
    return school;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = getSchoolObject;
