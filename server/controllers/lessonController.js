const getSchoolObject = require('../utils/getSchoolObject');
const messages = require('../resources/messages');
const moment = require('moment-timezone');
const { calculateRemainingCredits } = require('../utils/creditsUtils');
const webPush = require('web-push');

// Function to send a notification to a user
async function sendNotification(userId, payload) {
  try {
    // Retrieve the user's subscription information
    const user = await User.findById(userId);
    if (!user || !user.subscription) {
      throw new Error('User or subscription not found');
    }

    // Send the notification
    await webPush.sendNotification(user.subscription, JSON.stringify(payload));
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Get all lessons by date
exports.getLessonsByDate = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const { date } = req.params;

    if(!date) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    }

    const school = await getSchoolObject(req.models);
    const schoolId = school._id;

    // Validate required fields
    if (!date  || !schoolId) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    const { timeZone } = school.settings;

    // Create moment objects for the start and end of the day in the specified time zone
    const startOfDay = moment.tz(date, 'YYYY-MM-DD', timeZone).startOf('day');
    const endOfDay = moment.tz(date, 'YYYY-MM-DD', timeZone).endOf('day');

    // Find lessons for the specified day
    const lessons = await Lesson.find({
      startTime: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() },
    })
      .populate('instructors', '_id fullName')
      .populate('students', '_id fullName');

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
}

exports.assignInstructor = async (req, res) => {
  try {
    const { Lesson, User } = req.models;
    const { lessonId } = req.params;
    const { instructorId } = req.body;

    const lessonObj = await Lesson.findById(lessonId);
    if (!lessonObj) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    const instructorObj = await User.findById(instructorId);
    if (!instructorObj || instructorObj.role !== 'instructor') {
      return res.status(400).json({ message: 'ID de professor inválido' });
    }

    // Assign the instructor to the lesson
    const lesson = await Lesson.findByIdAndUpdate(lessonObj, { instructors: instructorObj }, { new: true });

    // Send a notification to the instructor
    // const lessonDetails = {
    //   title: 'New Lesson Assigned',
    //   body: `You have been assigned to a new lesson starting at ${lesson.startTime}`,
    // };
    // await sendNotification(instructorId, lessonDetails);

    res.status(200).json({ message: 'Professor atribuído com sucesso', lesson });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}

// Assign an instructor to multiple lessons (admin-only)
exports.assignInstructorToLessons = async (req, res) => {
  const session = await req.models.Lesson.db.startSession();
  session.startTransaction();
  try {
    const { Lesson } = req.models;
    const { instructorId, lessonIds } = req.body; // Get instructor ID and lesson IDs from request body

    // Validate input
    if (!instructorId || !lessonIds || !Array.isArray(lessonIds)) {
      return res.status(400).json({ message: 'Entrada inválida' });
    }

    // Assign the instructor to each lesson
    const lessons = await Lesson.find({ _id: { $in: lessonIds } }).session(session);
    for (const lesson of lessons) {
      if (!lesson.instructors.includes(instructorId)) {
        lesson.instructors.push(instructorId);
        await lesson.save({ session });
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // // Send a notification to the instructor
    // const lessonDetails = {
    //   title: 'New Lessons Assigned',
    //   body: `You have been assigned to new lessons.`,
    // };
    // await sendNotification(instructorId, lessonDetails);

    res.status(200).json({ message: 'Professor atribuído às aulas com sucesso', lessons });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    console.error('Error assigning instructor to lessons:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

// Remove an instructor from a lesson (admin-only)
exports.removeInstructorFromLesson = async (req, res) => {
  const session = await req.models.Lesson.db.startSession();
  session.startTransaction();
  try {
    const { Lesson } = req.models;
    const { lessonId } = req.params;
    const { instructorId } = req.body; // Get instructor ID from request body

    // Find the lesson
    const lesson = await Lesson.findById(lessonId).session(session);

    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    // Remove the instructor from the lesson
    lesson.instructors = lesson.instructors.filter(id => id.toString() !== instructorId);
    await lesson.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Professor removido com sucesso', lesson });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    console.error('Error removing instructor:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

// Get all lessons for a specific instructor
exports.getLessonsByInstructor = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const { instructorId } = req.params;

    // Find lessons where the instructor is assigned
    const lessons = await Lesson.find({
      instructors: instructorId,
    }).populate('instructors students');

    res.status(200).json({ lessons });
  } catch (error) {
    console.error('Error retrieving lessons by instructor:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.bookLesson = async (req, res) => {
  const session = await req.models.Lesson.db.startSession();
  session.startTransaction();

  try {
    const { Lesson, User, StudentProfile } = req.models;
    const { lessonId } = req.params;
    const studentId = req.user.id; //authenticated user 
    const school = await getSchoolObject(req.models);
    const { timeZone, bookingWindow } = school.settings;

    const lesson = await Lesson.findById(lessonId).session(session);

    if (!lesson) {
      return res.status(404).json({ message: messages.pt.lessonNotFound });
    }

    // Check if the booking is within the allowed window
    const now = moment.tz(timeZone);
    const lessonStartTime = moment.tz(lesson.startTime, timeZone);
    const hoursDifference = lessonStartTime.diff(now, 'hours');

    console.log('now', now);
    console.log('lesson start time', lessonStartTime);
    console.log('Hours Difference:', hoursDifference);
    
    if (hoursDifference <= 0 ) {
      return res.status(400).json({ message: 'Não é possível agendar aula no passado ou já em andamento' });
    }

    if (hoursDifference < bookingWindow) {
      return res.status(400).json({ message: `Não é possível agendar aula com menos de ${bookingWindow} horas de antecedência` });
    }

    // Check if the lesson is in the past
    if (lesson.startTime <= now) {
      return res.status(400).json({ message: 'Não é possível agendar aula no passado' });
    }

    // Check if the student is already booked
    if (lesson.students.includes(studentId)) {
      return res.status(400).json({ message: messages.pt.lessonAlreadyBooked });
    }

    // Check if the lesson has reached the student limit
    if (lesson.students.length >= lesson.studentLimit) {
      return res.status(400).json({ message: messages.pt.lessonFull });
    }

    // Retrieve the user's profile with the studentProfile populated
    const user = await User.findById(studentId).populate('studentProfile').session(session);
    if (!user) {
      return res.status(404).json({ message: 'Usuario não encontrado' });
    }

    // Garante perfil de aluno para contas antigas/inconsistentes.
    let studentProfile = user.studentProfile;
    if (!studentProfile) {
      const createdProfiles = await StudentProfile.create([{ user: user._id }], { session });
      studentProfile = createdProfiles[0];
      user.studentProfile = studentProfile._id;
      await user.save({ session });
    }

    // Calculate remaining credits
    const remainingCredits = calculateRemainingCredits(studentProfile);

    // Check if the contract has expired
    if (studentProfile.contractExpiration && new Date() > studentProfile.contractExpiration) {
      return res.status(400).json({ message: 'Contrato expirado' });
    }

    // Check if the student has remaining lessons
    if (remainingCredits <= 0) {
      return res.status(400).json({ message: messages.pt.lessonCannotBook });
    }
    
    // Add the student to the lesson
    lesson.students.push(studentId);
    
    await lesson.save({ session });

    // Update the student's lesson history and lesson counts
    studentProfile.lessonHistory.push(lessonId);
    studentProfile.usedCredits += 1;
    await studentProfile.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: messages.pt.lessonBooked, lesson });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
}

exports.cancelBooking = async (req, res) => {
  const session = await req.models.Lesson.db.startSession();
  session.startTransaction();
  try {
    const { Lesson, User, StudentProfile } = req.models;
    const { lessonId } = req.params;
    const studentId = req.user.id; //authenticated user 

    const lesson = await Lesson.findById(lessonId).session(session);

    if (!lesson) {
      return res.status(404).json({ message: messages.pt.lessonNotFound });
    }

    // Retrieve the school's time zone from the lesson
    const school = await getSchoolObject(req.models);
    const { timeZone, cancellationPolicy } = school.settings;

    // Check if the cancellation is less than 12 hours before the lesson starts
    const now = moment.tz(timeZone);
    const lessonStartTime = moment.tz(lesson.startTime, timeZone);
    const hoursDifference = lessonStartTime.diff(now, 'hours');
    if (hoursDifference < cancellationPolicy) {
      return res.status(400).json({ message: messages.pt.lessonCannotCancel });
    }

    // Remove the student from the lesson
    lesson.students = lesson.students.filter(student => student.toString() !== studentId);
    await lesson.save({ session });

    // Update the student's lesson history and lesson counts
    const user = await User.findById(studentId).populate('studentProfile').session(session);
    if (!user) {
      return res.status(404).json({ message: 'Usuario não encontrado' });
    }

    // Garante perfil de aluno para contas antigas/inconsistentes.
    let studentProfile = user.studentProfile;
    if (!studentProfile) {
      const createdProfiles = await StudentProfile.create([{ user: user._id }], { session });
      studentProfile = createdProfiles[0];
      user.studentProfile = studentProfile._id;
      await user.save({ session });
    }

    studentProfile.lessonHistory = studentProfile.lessonHistory.filter(lesson => lesson.toString() !== lessonId);
    studentProfile.usedCredits = Math.max(0, (studentProfile.usedCredits || 0) - 1);
    await studentProfile.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Reserva cancelada com sucesso', lesson });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}

exports.getAssignedLessonsByInstructor = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const instructorId = req.user.id; //authenticated user 

    if (req.user.role !== 'instructor') {
      return res.status(400).json({ message: 'Professor inválido' });
    }

    const lessons = await Lesson.find({ instructors: instructorId }).populate('instructors students');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}

exports.getSchoolLessons = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const school = await getSchoolObject(req.models);
    const schoolId = school._id;
    
    const lessons = await Lesson.find({ school: schoolId })
      .populate('instructors', '_id fullName')
      .populate('students', '_id fullName');

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
}

// Get the next lesson booked by the authenticated student
exports.getNextLessonByStudent = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const studentId = req.user.id; // Get the student ID from the authenticated user

    // Log the current date for debugging
    const currentDate = new Date();
    console.log(studentId);
    console.log('Current Date:', currentDate);

    // Find the next lesson where the student is booked
    const nextLesson = await Lesson.findOne({
      students: studentId,
      startTime: { $gt: currentDate }, // Only consider future lessons
    })
      .sort({ startTime: 1 }) // Sort by startTime in ascending order
      .populate('instructors students');

    if (!nextLesson) {
      return res.status(404).json({ message: 'Nenhuma aula futura encontrada' });
    }

    res.status(200).json({ nextLesson });
  } catch (error) {
    console.error('Error retrieving next lesson:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}


//Admin
// Create all lessons for a specific day (admin-only)
exports.createLessonsForDay = async (req, res) => {
  try {
    const { Lesson } = req.models;

    const { date, location, studentLimit } = req.body;

    const school = await getSchoolObject(req.models);
    const schoolId = school._id;

    // Validate required fields
    if (!date || !location || !studentLimit || !schoolId) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    const { lessonDuration, timeZone } = school.settings;
    
    const startTimes = ['06:00', '07:00', '08:00', '09:00', '14:00', '15:00', '16:00'];

    // Create lessons for each start time
    const lessons = [];
    for (const startTimeStr of startTimes) {
      // Create a moment object for the start time in the specified time zone
      const startTime = moment.tz(`${date} ${startTimeStr}`, timeZone);
      // Calculate end time based on duration
      const endTime = startTime.clone().add(lessonDuration, 'minutes');

      const newLesson = new Lesson({
        startTime: startTime.toDate(),
        endTime: endTime.toDate(),
        location,
        studentLimit,
        school: schoolId,
      });
      lessons.push(newLesson);
    }


    // Save all lessons to the database
    await Lesson.insertMany(lessons);

    res.status(201).json({ message: 'Aulas criadas com sucesso', lessons });
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError, error: error.message });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const lessons = req.body;

    // Validate required fields
    if (!lessons || !Array.isArray(lessons)) {
      return res.status(400).json({ message: 'Entrada inválida' });
    }

    const school = await getSchoolObject(req.models);
    const schoolId = school._id;
    const { lessonDuration, timeZone } = school.settings;

    // Process each lesson in the array
    const createdLessons = [];
      for (const lessonData of lessons) {
        const {startTime, endTime, location, studentLimit , instructors} = lessonData;
          
        if (!startTime || !endTime || !location || !studentLimit) {
          return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
        }
        
        // Create a moment object for the start time in the specified time zone
        const lessonStartTime = moment.tz(`${startTime}`, timeZone);

        let lessonEndTime;

        if (endTime) {
          lessonEndTime = moment.tz(`${endTime}`, timeZone);
        } else {
          // Calculate end time based on duration
          lessonEndTime = lessonStartTime.clone().add(lessonDuration, 'minutes');
        }

        // Create a new lesson
        const newLesson = new Lesson({
          startTime: lessonStartTime,
          endTime: lessonEndTime,
          location,
          studentLimit,
          school: schoolId,
          instructors: instructors || []
        });

        // Save the lesson to the database
        await newLesson.save();
        createdLessons.push(newLesson);
      }
    res.status(201).json({ message: 'Aula criada com sucesso', lesson: createdLessons });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}

exports.editLesson = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const { lessonId } = req.params;
    const updateData = req.body; // Get update data from request body

    // Find the lesson by ID and update it
    const updatedLesson = await Lesson.findByIdAndUpdate(lessonId, updateData, { new: true });

    if (!updatedLesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    res.status(200).json({ message: 'Aula atualizada com sucesso', lesson: updatedLesson });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.getBookedLessonsPerStudent = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const studentId = req.user.id; // Get the student ID from the authenticated user

    // Find lessons where the authenticated user is booked
    const lessons = await Lesson.find({
      students: studentId,
    })
      .populate('instructors', '_id fullName')
      .populate('students', '_id fullName');

    res.status(200).json({ lessons });
  } catch (error) {
    console.error('Error retrieving booked lessons per student:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

exports.getTodaysLessonsByStudent = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const studentId = req.user.id; // Get the student ID from the authenticated user
    const school = await getSchoolObject(req.models);
    const { timeZone } = school.settings;

    // Get the start and end of the current day in the specified time zone
    const startOfDay = moment.tz(timeZone).startOf('day').toDate();
    const endOfDay = moment.tz(timeZone).endOf('day').toDate();

    // Find lessons where the student is booked and the startTime is today
    const todayLesson = await Lesson.find({
      students: studentId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
    }).populate('instructors students');

    if (!todayLesson) {
      return res.status(404).json({ message: 'Nenhuma aula encontrada para hoje' });
    }

    res.status(200).json({ todayLesson });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};

// Delete lesson (admin-only)
exports.deleteLesson = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const { lessonId } = req.params;

    const deletedLesson = await Lesson.findByIdAndDelete(lessonId);
    if (!deletedLesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    res.status(200).json({ message: 'Aula removida com sucesso' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
};


