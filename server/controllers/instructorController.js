// Assign instructor role and create profile (admin-only)
exports.assignInstructorRole = async (req, res) => {
  try {
    const { User, InstructorProfile, StudentProfile } = req.models;
    const { instructorId } = req.params;

    // Find the user by ID
    const user = await User.findById(instructorId);

    if (!user) {
      return res.status(404).json({ message: "Usuario não encontrado" });
    }

    // Assign the instructor role
    user.role = "instructor";

    const studentProfile = await StudentProfile.findOneAndDelete({
      user: instructorId,
    });
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

    res.status(201).json({
      message: "Perfil de professor criado e papel atribuido com sucesso",
      user,
      instructorProfile,
    });
  } catch (error) {
    console.error("Erro ao atribuir papel de professor:", error);
    res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// Get all lessons assigned to an instructor
exports.getInstructorLessons = async (req, res) => {
  try {
    const { Lesson } = req.models;
    const { instructorId } = req.params;

    // Find lessons where the instructor is assigned
    const lessons = await Lesson.find({
      instructors: instructorId,
    }).populate("instructors");

    res.status(200).json({ lessons });
  } catch (error) {
    console.error("Erro ao buscar aulas do professor:", error);
    res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// Get all instructors (admin)
exports.getAllInstructors = async (req, res) => {
  try {
    const { User } = req.models;
    const instructors = await User.find({ role: "instructor" }).populate(
      "instructorProfile",
    );
    res.status(200).json(instructors);
  } catch (error) {
    console.error("Erro ao buscar professores:", error);
    res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// Get instructors list for authenticated non-admin usage (id + name only)
exports.getPublicInstructors = async (req, res) => {
  try {
    const { User } = req.models;
    const instructors = await User.find(
      { role: "instructor" },
      { _id: 1, fullName: 1 },
    ).lean();
    res.status(200).json(instructors);
  } catch (error) {
    console.error("Erro ao buscar professores (publico):", error);
    res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// Remove instructor role and profile (admin-only)
exports.removeInstructorRole = async (req, res) => {
  try {
    const { User, InstructorProfile, StudentProfile } = req.models;
    const { instructorId } = req.params;

    const user = await User.findById(instructorId);
    if (!user) {
      return res.status(404).json({ message: "Usuario não encontrado" });
    }

    const instructorProfile = await InstructorProfile.findOneAndDelete({
      user: instructorId,
    });
    if (instructorProfile) {
      user.instructorProfile = undefined;
    }

    user.role = "student";

    let studentProfile = await StudentProfile.findOne({ user: instructorId });
    if (!studentProfile) {
      studentProfile = new StudentProfile({ user: instructorId });
      await studentProfile.save();
    }
    user.studentProfile = studentProfile._id;

    await user.save();

    res.status(200).json({ message: "Papel de professor removido com sucesso", user });
  } catch (error) {
    console.error("Erro ao remover papel de professor:", error);
    res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};
