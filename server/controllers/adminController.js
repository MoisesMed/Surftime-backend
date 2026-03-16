const mongoose = require('mongoose');

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getAdminDashboard = async (req, res) => {
  try {
    const { User, StudentProfile, Lesson } = req.models;
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const totalStudentsPromise = User.countDocuments({
      role: 'student',
      isAdmin: { $ne: true },
    });

    const studentsWithPendingLessonsPromise = Lesson.distinct('students', {
      endTime: { $gte: now },
    });

    const trialStudentsPromise = StudentProfile.countDocuments({
      totalCredits: 0,
      usedCredits: { $gt: 0 },
    });

    const lessonsCompletedPromise = Lesson.countDocuments({
      endTime: { $lt: now },
    });

    const lessonsTodayPromise = Lesson.countDocuments({
      startTime: { $gte: startOfDay, $lte: endOfDay },
      'students.0': { $exists: true },
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
      studentsWithPendingLessons,
      trialStudents,
      lessonsCompleted,
      lessonsToday,
    ] = await Promise.all([
      totalStudentsPromise,
      studentsWithPendingLessonsPromise,
      trialStudentsPromise,
      lessonsCompletedPromise,
      lessonsTodayPromise,
    ]);

    const activePlans = await StudentProfile.countDocuments({
      status: 'active',
      $or: [
        {
          $expr: {
            $gt: [
              { $ifNull: ['$totalCredits', 0] },
              { $ifNull: ['$usedCredits', 0] },
            ],
          },
        },
        {
          user: { $in: studentsWithPendingLessons },
        },
      ],
      $and: [
        {
          $or: [
            { contractExpiration: { $exists: false } },
            { contractExpiration: null },
            { contractExpiration: { $gte: now } },
          ],
        },
      ],
    });

    const studentsCompletedLessons =
      studentsCompletedLessonsAgg?.[0]?.count || 0;

    return res.status(200).json({
      totalStudents,
      activePlans,
      trialStudents,
      lessonsCompleted,
      lessonsToday,
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
    const { AuditLog, User } = req.models;
    const {
      page = 1,
      limit = 50,
      action,
      actorUserId,
      userId,
      targetId,
      userName,
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
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const selectedUser = await User.findById(userId)
        .select('_id studentProfile instructorProfile')
        .lean();

      if (!selectedUser?._id) {
        return res.status(200).json({
          page: parsedPage,
          limit: parsedLimit,
          total: 0,
          logs: [],
        });
      }

      const relatedIds = [
        selectedUser._id,
        selectedUser.studentProfile,
        selectedUser.instructorProfile,
      ]
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id));

      query.$or = [
        { 'target.id': { $in: relatedIds } },
        { 'metadata.userId': new mongoose.Types.ObjectId(selectedUser._id) },
      ];
    }
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      query['target.id'] = new mongoose.Types.ObjectId(targetId);
    }
    if (from || to) {
      query.timestamp = {};
      if (from) {
        const startDate = new Date(from);
        if (!Number.isNaN(startDate.getTime())) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(from))) {
            startDate.setHours(0, 0, 0, 0);
          }
          query.timestamp.$gte = startDate;
        }
      }
      if (to) {
        const endDate = new Date(to);
        if (!Number.isNaN(endDate.getTime())) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
            endDate.setHours(23, 59, 59, 999);
          }
          query.timestamp.$lte = endDate;
        }
      }
    }

    if (!query.$or && userName && String(userName).trim()) {
      const matchedUsers = await User.find({
        fullName: {
          $regex: escapeRegex(String(userName).trim()),
          $options: 'i',
        },
      })
        .select('_id studentProfile instructorProfile')
        .lean();

      const userIds = matchedUsers
        .map((user) => user?._id)
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id));

      const profileIds = matchedUsers
        .flatMap((user) => [user?.studentProfile, user?.instructorProfile])
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id));

      if (!userIds.length && !profileIds.length) {
        return res.status(200).json({
          page: parsedPage,
          limit: parsedLimit,
          total: 0,
          logs: [],
        });
      }

      query.$or = [
        ...(userIds.length
          ? [
              { 'target.id': { $in: userIds } },
              { 'metadata.userId': { $in: userIds } },
            ]
          : []),
        ...(profileIds.length ? [{ 'target.id': { $in: profileIds } }] : []),
      ];
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

