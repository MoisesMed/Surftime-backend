const School = require("../models/School");
const schoolConfig = require('../schoolConfig');

async function getSchoolObject() {
    try {
        const school = await School.findOne({ name: schoolConfig.schoolName });
        
        if(!school){
            throw new Error('School not found');
        }
        return school;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = getSchoolObject;
