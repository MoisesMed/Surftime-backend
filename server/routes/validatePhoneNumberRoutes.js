import connectToDatabase from '../db';
import { validatePhoneNumber } from '../controllers/validatePhoneNumber';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectToDatabase(); // Ensure the database is connected
      await validatePhoneNumber(req, res); // Use the controller function
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}