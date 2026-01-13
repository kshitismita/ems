import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import { verifyToken, AuthUser } from '@/lib/auth';

// GET attendance records for the current employee
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user: AuthUser = verifyToken(token);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: any = { employee: user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments(query);

    return NextResponse.json({
      attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Attendance GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

// POST - Create or update attendance record
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user: AuthUser = verifyToken(token);

    await connectDB();

    const body = await req.json();
    const { date, checkIn, checkOut, breakStart, breakEnd, status, notes, location } = body;

    // Default status to 'present' if not provided
    const attendanceStatus = status || 'present';

    // Parse and validate the date
    // Use components to avoid time zone shifts
    const [year, month, day] = date.split('-').map(Number);
    const attendanceDate = new Date(year, month - 1, day);

    if (isNaN(attendanceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Validate checkIn time
    let checkInTime;
    if (checkIn.includes(':')) {
      // Parse HH:MM format
      const [hours, minutes] = checkIn.split(':');
      checkInTime = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0);
    } else {
      // Try parsing as full datetime string
      checkInTime = new Date(checkIn);
    }

    if (isNaN(checkInTime.getTime())) {
      return NextResponse.json({ error: 'Invalid check-in time format. Use HH:MM format' }, { status: 400 });
    }

    // Create proper date objects
    const attendanceDateOnly = new Date(year, month - 1, day);
    const attendanceDateWithTime = new Date(checkInTime);

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      employee: user.id,
      date: attendanceDateOnly
    });

    let attendance;
    let isNewRecord = false;

    if (existingAttendance) {
      // Update existing record
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          checkIn: attendanceDateWithTime,
          checkOut: checkOut ? new Date(checkOut) : existingAttendance.checkOut,
          breakStart: breakStart ? new Date(breakStart) : existingAttendance.breakStart,
          breakEnd: breakEnd ? new Date(breakEnd) : existingAttendance.breakEnd,
          status: attendanceStatus,
          notes: notes !== undefined ? notes : existingAttendance.notes,
          location: location !== undefined ? location : existingAttendance.location,
        },
        { new: true }
      );
    } else {
      // Create new record
      attendance = new Attendance({
        employee: user.id,
        date: attendanceDateOnly,
        checkIn: attendanceDateWithTime,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        breakStart: breakStart ? new Date(breakStart) : undefined,
        breakEnd: breakEnd ? new Date(breakEnd) : undefined,
        status: attendanceStatus,
        notes: notes || '',
        location: location || '',
      });

      await attendance.save();
      isNewRecord = true;
    }

    return NextResponse.json({ attendance, isNewRecord }, { status: 201 });

  } catch (error) {
    console.error('Attendance POST Error:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
