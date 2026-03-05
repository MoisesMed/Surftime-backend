const getSchoolObject = require('../utils/getSchoolObject');
const cloudinary = require('../config/cloudinaryConfig');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const { getModels } = require('../models');
const schoolRegistryDef = require('../models/SchoolRegistry');

const registryConnectionCache = new Map();

async function getRegistryConnection(baseUri) {
  const registryDbName = process.env.REGISTRY_DB_NAME || 'surftime_registry';
  if (registryConnectionCache.has(registryDbName)) {
    return registryConnectionCache.get(registryDbName);
  }
  const conn = await mongoose
    .createConnection(baseUri, { dbName: registryDbName })
    .asPromise();
  registryConnectionCache.set(registryDbName, conn);
  return conn;
}

function getRegistryModel(conn) {
  return (
    conn.models[schoolRegistryDef.name] ||
    conn.model(schoolRegistryDef.name, schoolRegistryDef.schema, 'schools_registry')
  );
}

async function upsertRegistrySchool({ baseUri, name, subdomain, logoUrl }) {
  const conn = await getRegistryConnection(baseUri);
  const Registry = getRegistryModel(conn);
  await Registry.updateOne(
    { subdomain },
    { $set: { name, subdomain, logoUrl } },
    { upsert: true }
  );
}


exports.createSchool = async (req, res) => {
  try {
    const { School } = req.models;
    const { name, address, contactEmail, contactPhone } = req.body;

    if (!name) {
        return res.status(400).json({ status: 'fail', message: 'School must have a name' });
    }

    const school = new School({
      name,
      address,
      contactEmail,
      contactPhone,
    });
    await school.save();

    res.status(201).json({ message: 'Surf school created successfully', School: school });

  } catch (err) {
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
  }
};

exports.getSchoolUsers = async (req, res) => {
  try {
    const school = await getSchoolObject(req.models);

    // Populate only students AND load their studentProfile
    await school.populate({
      path: 'users',
      match: { role: 'student' },
      populate: {
        path: 'studentProfile'
      }
    });
    const students = school.users || [];

    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.getSchoolData = async (req, res) => {
  try {
    const { School } = req.models;
    const school = await getSchoolObject(req.models);
    const schoolId = school._id;

    const schoolData = await School.findById(schoolId).populate('settings');

    if (!schoolData) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({ schoolData });

  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.getSchoolDataForUser = async (req, res) => {
try {
    const { School } = req.models;
    console.log('[getSchoolDataForUser] dbName:', School.db?.name);
    const schoolObj = await getSchoolObject(req.models);
  
    // Find the school by ID and select only the basic fields
    const school = await School.findById(schoolObj._id).select('name address contactEmail contactPhone settings.logoUrls');
  
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    
    res.status(200).json({ name: school.name,
      address: school.address,
      contactEmail: school.contactEmail,
      contactPhone: school.contactPhone,
      logoUrls: school.settings.logoUrls, 
    });
} catch (error) {
  res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
}


};

exports.updateSchool = async (req, res) => {
  try {
    const { School } = req.models;
    const school = await getSchoolObject(req.models);
    const schoolId = school._id;

    const updateData = req.body;

    // Check if a logo file is uploaded
    if (req.file) {
      const originalResult = await cloudinary.uploader.upload(req.file.path, {
        public_id: `school_${schoolId}_original`,
      });

      // Define transformations for different sizes
      const transformations = [
        { width: 36, height: 36, crop: 'fill', suffix: 'small' },
        { width: 72, height: 72, crop: 'fill', suffix: 'medium' },
        { width: 80, height: 80, crop: 'fill', suffix: 'large' }, 
      ];

      // Upload the logo to Cloudinary and apply transformations with custom public IDs
      const uploadPromises = transformations.map(({ width, height, crop, suffix }) =>
        cloudinary.uploader.upload(req.file.path, {
          transformation: { width, height, crop },
          public_id: `school_${schoolId}_${suffix}`,
        })
      );

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      // Extract URLs for each transformed image
      const transformedUrls = results.map(result => result.secure_url);

      // Combine the original and transformed URLs into a single array
      const logoUrls = [originalResult.secure_url, ...transformedUrls];

      // Update the school's settings with the logo URLs
      updateData['settings.logoUrls'] = logoUrls; // Save the array of logo URLs
    }

    // Update the school's profile with the logo URL
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      updateData,
      { new: true }
    );
    
    // Check if the school was updated
    if (!updatedSchool) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({ message: 'School information updated successfully', school: updatedSchool });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.createContracts = async (req, res) => {
  try {
    const school = await getSchoolObject(req.models);
    const contracts = req.body; // Get contract details from request body

    // Validate required fields for each contract
    for (const contract of contracts) {
      const { type, credits, price, expirationPeriod } = contract;
      if (!type || !credits || price === undefined || !expirationPeriod.value || !expirationPeriod.unit) {
        return res.status(400).json({ message: 'Missing required fields in one or more contracts' });
      }
    }

    // Add each contract to the school's settings
    for (const contract of contracts) {
      const { type } = contract;
      // Check if a contract with the same type already exists
      const existingContract = school.settings.contracts.find(c => c.type === type);
      if (existingContract) {
        return res.status(400).json({ message: `Contract type "${type}" already exists` });
      }
      school.settings.contracts.push(contract);
    }

    await school.save();

    res.status(200).json({ message: 'School contracts updated successfully', school: school });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

// Get default lesson times for a school
exports.getDefaultData = async (req, res) => {
  try {
    const school = await getSchoolObject(req.models);
    
    // Populate the users field after retrieving the school object
    await school.populate('users');

    const { timeZone } = school.settings;

    // Define the default lesson times (example times)
    const defaultLessonTimes = [
      { startHour: 6, endHour: 7 },
      { startHour: 7, endHour: 8 },
      { startHour: 8, endHour: 9 },
      { startHour: 9, endHour: 10 },
      { startHour: 14, endHour: 15 },
      { startHour: 15, endHour: 16 },
      { startHour: 16, endHour: 17 },
    ];

    // Generate the lesson times for a specific date
    const date = moment().format('YYYY-MM-DD'); // today date
    const times = defaultLessonTimes.map(({ startHour, endHour }) => {
      const startTime = moment.tz(`${date} ${startHour}:00`, 'YYYY-MM-DD HH:mm', timeZone).toISOString();
      const endTime = moment.tz(`${date} ${endHour}:00`, 'YYYY-MM-DD HH:mm', timeZone).toISOString();
      return { startTime, endTime };
    });

    const allInstructors = school.users.filter(user => user.role === 'instructor');
    const templateInstructorIds = (school.settings?.templateInstructorIds || []).map((id) => id.toString());
    const instructors = templateInstructorIds.length > 0
      ? allInstructors.filter((user) => templateInstructorIds.includes(user._id.toString()))
      : allInstructors;

    // Return the default lesson times
    res.status(200).json({
      times,
      location: school.address,
      lessonSlots: school.settings.numberOfStudentsPerLesson,
      instructors: instructors.map(instructor => ({
        id: instructor._id,
        fullName: instructor.fullName,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

// GET /school/about
exports.getAboutUs = async (req, res) => {
  try {
    const school = await getSchoolObject(req.models);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({ aboutUs: school.aboutUs });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
  }
};


exports.updateAboutUs = async (req, res) => {
  try {
    const { School } = req.models;
    const school = await getSchoolObject(req.models);
    const schoolId = school._id;
    const { aboutUs } = req.body;
    
    // Must be a string, but can contain HTML / rich text
    if (typeof aboutUs !== 'string') {
      return res.status(400).json({
        message: 'aboutUs must be a string'
      });
    }

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { aboutUs },
      { new: true }
    ).select('aboutUs');

    if (!updatedSchool) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({
      message: 'About Us updated successfully',
      aboutUs: updatedSchool.aboutUs
    });
  } catch (err) {
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: err.message
    });
  }
};

function toDbName(value) {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Provision a new school in its own database
exports.provisionSchool = async (req, res) => {
  try {
    const provisionKey = req.headers['x-provision-key'];
    if (!process.env.PROVISION_KEY || provisionKey !== process.env.PROVISION_KEY) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, subdomain } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'School must have a name' });
    }

    const baseUri =
      process.env.MONGODB_BASE_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;

    if (!baseUri) {
      return res.status(500).json({ message: 'MONGODB_BASE_URI is not configured' });
    }

    const dbName = toDbName(subdomain || name);
    if (!dbName) {
      return res.status(400).json({ message: 'Invalid subdomain or name' });
    }

    const conn = await mongoose.createConnection(baseUri, { dbName }).asPromise();
    const { School, User } = getModels(conn);

    const adminFullName = process.env.PROVISION_ADMIN_FULLNAME;
    const adminPhone = process.env.PROVISION_ADMIN_PHONE;
    const adminEmail = process.env.PROVISION_ADMIN_EMAIL;
    const adminPassword = process.env.PROVISION_ADMIN_PASSWORD;
    const adminBirthday = process.env.PROVISION_ADMIN_BIRTHDAY;

    const missing = [];
    if (!adminFullName) missing.push('PROVISION_ADMIN_FULLNAME');
    if (!adminPhone) missing.push('PROVISION_ADMIN_PHONE');
    if (!adminEmail) missing.push('PROVISION_ADMIN_EMAIL');
    if (!adminPassword) missing.push('PROVISION_ADMIN_PASSWORD');
    if (!adminBirthday) missing.push('PROVISION_ADMIN_BIRTHDAY');
    if (missing.length > 0) {
      await conn.close();
      return res.status(400).json({
        message: 'Provision admin env vars missing',
        missing,
      });
    }

    const parsedBirthday = new Date(adminBirthday);
    if (Number.isNaN(parsedBirthday.getTime())) {
      await conn.close();
      return res.status(400).json({
        message: 'Invalid PROVISION_ADMIN_BIRTHDAY (expected YYYY-MM-DD)',
        invalid: ['PROVISION_ADMIN_BIRTHDAY'],
      });
    }

    let school = await School.findOne();
    if (!school) {
      const createData = { name };
      school = await School.create(createData);
    }

    let adminUser =
      (await User.findOne({ phoneNumber: adminPhone })) ||
      (await User.findOne({ email: adminEmail }));

    if (!adminUser) {
      adminUser = await User.create({
        fullName: adminFullName,
        phoneNumber: adminPhone,
        email: adminEmail,
        password: adminPassword,
        role: 'instructor',
        isAdmin: true,
        birthday: parsedBirthday,
      });
    } else {
      if (!adminUser.isAdmin || adminUser.role !== 'instructor') {
        adminUser.isAdmin = true;
        adminUser.role = 'instructor';
        await adminUser.save();
      }
    }

    if (!school.users.some((id) => id.toString() === adminUser._id.toString())) {
      school.users.push(adminUser._id);
      await school.save();
    }

    await upsertRegistrySchool({
      baseUri,
      name: school.name,
      subdomain: dbName,
      logoUrl: school?.settings?.logoUrls?.[0] || null,
    });

    await conn.close();
    return res.status(201).json({ dbName, school, adminUserId: adminUser._id });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.listSchools = async (req, res) => {
  try {
    const baseUri =
      process.env.MONGODB_BASE_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;

    if (!baseUri) {
      return res.status(500).json({ message: 'MONGODB_BASE_URI is not configured' });
    }

    const conn = await getRegistryConnection(baseUri);
    const Registry = getRegistryModel(conn);
    const schools = await Registry.find({}, { name: 1, logoUrl: 1, subdomain: 1 }).sort({
      name: 1,
    });

    return res.status(200).json({ schools });
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

