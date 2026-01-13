import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import jwt from 'jsonwebtoken';

const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
        return null;
    }
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user: any = verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        const meeting = await Meeting.findById(id)
            .populate('organizer', 'name email')
            .populate('attendees', 'name email');

        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }

        // Check access - admin or attendee
        if (user.role !== 'admin' && !meeting.attendees.some((a: any) => a._id.toString() === user.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json({ meeting });
    } catch (error) {
        console.error('Error fetching meeting:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user: any = verifyToken(token);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await request.json();

        const meeting = await Meeting.findById(id);
        if (!meeting) {
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }


        // Validate time if updating
        if (body.startTime && body.endTime) {
            if (new Date(body.startTime) >= new Date(body.endTime)) {
                return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
            }
        }

        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        )
            .populate('organizer', 'name email')
            .populate('attendees', 'name email');


        return NextResponse.json({ meeting: updatedMeeting });
    } catch (error: any) {
        console.error('Error updating meeting:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        console.log('[MEETING_DELETE] Starting meeting deletion');
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            console.log('[MEETING_DELETE] No token provided');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user: any = verifyToken(token);
        if (!user || user.role !== 'admin') {
            console.log('[MEETING_DELETE] Unauthorized user:', user?.role);
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        console.log('[MEETING_DELETE] Deleting meeting with ID:', id);

        // Get the meeting before updating 
        const meeting = await Meeting.findById(id);
        if (!meeting) {
            console.log('[MEETING_DELETE] Meeting not found');
            return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
        }


        // Soft delete by setting status to cancelled
        const updatedMeeting = await Meeting.findByIdAndUpdate(
            id,
            { $set: { status: 'cancelled' } },
            { new: true }
        );

        console.log('[MEETING_DELETE] Meeting status updated to cancelled');


        console.log('[MEETING_DELETE] Meeting deletion completed successfully');
        return NextResponse.json({ message: 'Meeting cancelled successfully', meeting: updatedMeeting });
    } catch (error) {
        console.error('[MEETING_DELETE] Error deleting meeting:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
