const User = require('../models/User');
const InstructorProfile = require('../models/InstructorProfile');
const StudentProfile = require('../models/StudentProfile');
const Lesson = require('../models/Lesson');

// Assign instructor role and create profile (admin-only)
exports.assignInstructorRole = async (req, res) => {
    try {
        const { instructorId } = req.params;

        // Find the user by ID
        const user = await User.findById(instructorId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Assign the instructor role
        user.role = 'instructor';

        const studentProfile = await StudentProfile.findOneAndDelete({ user: instructorId });
        if (studentProfile) {
            user.studentProfile = undefined;
        }


        // Check if the instructor profile already exists
        let instructorProfile = await InstructorProfile.findOne({ user: instructorId });
        if (!instructorProfile) {
            // Create a new instructor profile
            instructorProfile = new InstructorProfile({ user: instructorId });
            await instructorProfile.save();
        }

        // Update the user with the instructor profile reference
        user.instructorProfile = instructorProfile._id;
        await user.save();

        res.status(201).json({ message: 'Instructor role assigned, profile created, and student profile removed successfully', user, instructorProfile });
    } catch (error) {
        console.error('Error assigning instructor role and creating profile:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get all lessons assigned to an instructor
exports.getInstructorLessons = async (req, res) => {
    try {
        const { instructorId } = req.params;

        // Find lessons where the instructor is assigned
        const lessons = await Lesson.find({
            instructors: instructorId,
        }).populate('instructors');

        res.status(200).json({ lessons });
    } catch (error) {
        console.error('Error retrieving lessons by instructor:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};