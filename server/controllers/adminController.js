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

exports.getAuditLogs = async (req, res) => {
  try {
    const { AuditLog } = req.models;
    const {
      page = 1,
      limit = 50,
      action,
      actorUserId,
      targetId,
      status,
      from,
      to,
    } = req.query;

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(200, Math.max(1, Number(limit) || 50));

    const query = {};
    if (action) query.action = action;
    if (status) query.status = status;
    if (actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)) {
      query['actor.userId'] = new mongoose.Types.ObjectId(actorUserId);
    }
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      query['target.id'] = new mongoose.Types.ObjectId(targetId);
    }
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.status(200).json({
      page: parsedPage,
      limit: parsedLimit,
      total,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao buscar logs de auditoria',
      error: error.message,
    });
  }
};

