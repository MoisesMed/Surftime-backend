const mongoose = require('mongoose');

exports.getAdminDashboard = async (req, res) => {
  try {
    const { User, StudentProfile, Lesson } = req.models;
    const now = new Date();

    const totalStudentsPromise = User.countDocuments({ role: 'student' });

    const activePlansPromise = StudentProfile.countDocuments({
      contract: { $ne: null },
      $or: [
        { contractExpiration: { $exists: false } },
        { contractExpiration: null },
        { contractExpiration: { $gte: now } },
      ],
    });

    const trialStudentsPromise = StudentProfile.countDocuments({
      totalCredits: 0,
      usedCredits: { $gt: 0 },
    });

    const lessonsCompletedPromise = Lesson.countDocuments({
      endTime: { $lt: now },
    });

    const ongoingLessons = await Lesson.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).select('students');

    const studentsInLessonSet = new Set();
    for (const lesson of ongoingLessons) {
      for (const studentId of lesson.students || []) {
        studentsInLessonSet.add(studentId.toString());
      }
    }

    const studentsCompletedLessonsAgg = await Lesson.aggregate([
      { $match: { endTime: { $lt: now } } },
      { $unwind: '$students' },
      { $group: { _id: '$students' } },
      { $count: 'count' },
    ]);

    const [
      totalStudents,
      activePlans,
      trialStudents,
      lessonsCompleted,
    ] = await Promise.all([
      totalStudentsPromise,
      activePlansPromise,
      trialStudentsPromise,
      lessonsCompletedPromise,
    ]);

    const studentsCompletedLessons =
      studentsCompletedLessonsAgg?.[0]?.count || 0;

    return res.status(200).json({
      totalStudents,
      activePlans,
      trialStudents,
      lessonsCompleted,
      studentsInLesson: studentsInLessonSet.size,
      studentsCompletedLessons,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
};

