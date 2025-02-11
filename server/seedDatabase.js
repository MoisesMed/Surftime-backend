const mongoose = require('mongoose');

// Connect to MongoDB Atlas
const uri = 'mongodb+srv://leo:swqhfumAbTIbNDJ2@surftimeapp.c261d.mongodb.net/surftimeapp_dosanjossurfschool?retryWrites=true&w=majority&appName=surftimeapp';
mongoose.connect(uri)
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(error => console.error('Error connecting to MongoDB Atlas:', error));

// Define your schemas and models here (as shown in previous examples)
const Student = require('./models/Student');
const Professor = require('./models/Professor');
const School = require('./models/School');
const SurfSession = require('./models/SurfSession');
const Settings = require('./models/Settings');

async function createInitialData() {
  try {
    // Create professors
    const professor1 = new Professor({
      fullName: 'Carlos dos Anjos',
      email: 'carlos.dosanjos@example.com',
      phoneNumber: '0987654321',
      isAdmin: true,
      profileImageUrl: 'http://example.com/images/carlos.jpg',
    });

    const professor2 = new Professor({
      fullName: 'Maria Oliveira',
      email: 'maria.oliveira@example.com',
      phoneNumber: '1234567891',
      profileImageUrl: 'http://example.com/images/maria.jpg',
    });

    await professor1.save();
    await professor2.save();

    // Create students
    const student1 = new Student({
      fullName: 'Ana Silva',
      email: 'ana.silva@example.com',
      phoneNumber: '1234567890',
      cpf: '123.456.789-00',
      birthday: new Date('2000-01-01'),
      observations: 'Loves surfing in the morning.',
      profileImageUrl: 'http://example.com/images/ana.jpg',
    });

    const student2 = new Student({
      fullName: 'João Pereira',
      email: 'joao.pereira@example.com',
      phoneNumber: '1234567892',
      cpf: '987.654.321-00',
      birthday: new Date('1995-05-15'),
      observations: 'Prefers afternoon sessions.',
      profileImageUrl: 'http://example.com/images/joao.jpg',
    });

    await student1.save();
    await student2.save();

    // Create surf sessions
    const surfSession1 = new SurfSession({
      date: new Date('2025-02-10'),
      timeSlot: { start: '10:00', end: '11:00' },
      professor: professor1._id,
      students: [student1._id],
      studentLimit: 5,
      location: 'Beach A',
      notes: 'Bring sunscreen.',
    });

    const surfSession2 = new SurfSession({
      date: new Date('2025-02-11'),
      timeSlot: { start: '14:00', end: '15:00' },
      professor: professor2._id,
      students: [student2._id],
      studentLimit: 5,
      location: 'Beach B',
      notes: 'Wetsuits provided.',
    });

    await surfSession1.save();
    await surfSession2.save();

    // Create settings
    const settings = new Settings({
      themeColor: '#00AEEF',
      logoUrl: 'http://example.com/images/logo.png',
      iconSet: 'default',
      customCSS: '.header { background-color: #00AEEF; }',
    });

    await settings.save();

    // Create school
    const school = new School({
      name: 'Dos Anjos Surf School',
      address: '123 Ocean Drive, Beach City',
      contactEmail: 'contact@dosanjossurfschool.com',
      contactPhone: '555-1234',
      professors: [professor1._id, professor2._id],
      students: [student1._id, student2._id],
      surfSessions: [surfSession1._id, surfSession2._id],
      settings: settings._id,
    });

    await school.save();

    console.log('Initial data created successfully');
  } catch (error) {
    console.error('Error creating initial data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createInitialData();