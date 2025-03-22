const School = require('../models/School');
const User = require('../models/User');
const getSchoolObject = require('../utils/getSchoolObject');
const cloudinary = require('../config/cloudinaryConfig');



exports.createSchool = async (req, res) => {
  try {
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
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

exports.getSchoolUsers = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findById(schoolId).populate('users');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({ users: school.users });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getSchoolData = async (req, res) => {
  try {
    const school = await getSchoolObject();
    const schoolId = school._id;

    const schoolData = await School.findById(schoolId).populate('settings');

    if (!schoolData) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({ schoolData });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.updateSchool = async (req, res) => {
  try {
    const school = await getSchoolObject();
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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.createContracts = async (req, res) => {
  try {
    const school = await getSchoolObject();
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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};