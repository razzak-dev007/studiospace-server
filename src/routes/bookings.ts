import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getBookingsCollection, getStudiosCollection } from '../db.js';
import { verifyAuth, AuthRequest } from '../middleware/auth.js';
import { Booking } from '../types.js';

const router = Router();

// Helper to convert "HH:mm" to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

// POST /api/bookings - Create new booking with Challenge 2 Double-Booking Overlap Prevention
router.post('/', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { studioId, bookingDate, startTime, endTime, creatorNotes } = req.body;

    if (!studioId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Studio ID, booking date, start time, and end time are required.',
      });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    if (endMin <= startMin) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.',
      });
    }

    const durationHours = Math.round(((endMin - startMin) / 60) * 10) / 10;
    if (durationHours < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum booking duration is 1 hour.',
      });
    }

    // Fetch studio to verify existence and calculate price
    const studiosCol = getStudiosCollection();
    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({ success: false, message: 'Invalid Studio ID format.' });
    }

    const studio = await studiosCol.findOne({ _id: new ObjectId(studioId) });
    if (!studio) {
      return res.status(404).json({ success: false, message: 'Studio workspace not found.' });
    }

    // Challenge 2: Booking Double-Booking Prevention
    // Check MongoDB for conflicting Confirmed or active Pending reservations on the same date
    const bookingsCol = getBookingsCollection();
    const existingBookingsOnDate = await bookingsCol
      .find({
        studioId: studioId.toString(),
        bookingDate: bookingDate,
        status: { $in: ['Confirmed', 'Pending'] },
      })
      .toArray();

    for (const b of existingBookingsOnDate) {
      const existingStart = timeToMinutes(b.startTime);
      const existingEnd = timeToMinutes(b.endTime);

      // Overlap condition: startA < endB && endA > startB
      if (startMin < existingEnd && endMin > existingStart) {
        return res.status(409).json({
          success: false,
          conflict: true,
          message: `Slot Conflict: This studio is already reserved on ${bookingDate} from ${b.startTime} to ${b.endTime} (${b.status}). Please choose a different time window or date.`,
        });
      }
    }

    const userEmail = req.user?.email || '';
    const userName = req.user?.name || 'Creative Guest';
    const totalPrice = Math.round(durationHours * studio.hourlyRate);

    const newBooking: Booking = {
      studioId: studio._id?.toString() || studioId,
      studioTitle: studio.title,
      studioCategory: studio.category,
      studioImage: studio.image,
      studioLocation: studio.location,
      hourlyRate: studio.hourlyRate,
      securityDeposit: studio.securityDeposit || 0,
      userEmail,
      userName,
      bookingDate,
      startTime,
      endTime,
      durationHours,
      totalPrice,
      creatorNotes: creatorNotes?.trim() || '',
      status: 'Pending', // Per requirement: Saves reservation in bookings collection with status "Pending"
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookingsCol.insertOne(newBooking);

    return res.status(201).json({
      success: true,
      message: 'Studio workspace reserved successfully! Your booking is currently Pending host confirmation.',
      bookingId: result.insertedId,
      booking: { ...newBooking, _id: result.insertedId },
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process booking reservation.',
    });
  }
});

// GET /api/bookings/my-bookings - User's reservations (Protected)
router.get('/my-bookings', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const bookingsCol = getBookingsCollection();
    const myBookings = await bookingsCol
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      success: true,
      count: myBookings.length,
      bookings: myBookings,
    });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your bookings.',
    });
  }
});

// GET /api/bookings/:id - Single booking for receipt/invoice
router.get('/:id', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const bookingsCol = getBookingsCollection();
    const booking = await bookingsCol.findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.userEmail !== req.user?.email && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden access to this reservation.' });
    }

    return res.json({
      success: true,
      booking,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to load booking.' });
  }
});

// PATCH /api/bookings/:id/cancel - Cancel pending booking
router.patch('/:id/cancel', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const bookingsCol = getBookingsCollection();
    const booking = await bookingsCol.findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.userEmail !== req.user?.email && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    await bookingsCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'Cancelled', updatedAt: new Date() } }
    );

    return res.json({
      success: true,
      message: 'Booking reservation has been cancelled.',
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel booking.',
    });
  }
});

// PATCH /api/bookings/:id/status - Update booking status (Demo confirmation helper)
router.patch('/:id/status', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const bookingsCol = getBookingsCollection();
    await bookingsCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    return res.json({
      success: true,
      message: `Booking status updated to ${status}.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

export default router;
