import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveRequest from '@/models/LeaveRequest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

        const leaveRequest = await LeaveRequest.findById(id)
            .populate('employee', 'name email employeeId')
            .populate('approvedBy', 'name email');

        if (!leaveRequest) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        // Check access - admin or own request
        if (user.role !== 'admin' && leaveRequest.employee._id.toString() !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json({ leaveRequest });
    } catch (error) {
        console.error('Error fetching leave request:', error);
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
        const { status, rejectionReason } = body;
        const leaveRequest = await LeaveRequest.findById(id);
        if (!leaveRequest) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        const isEditing = body.type || body.startDate || body.endDate || body.reason;

        if (isEditing) {
            if (leaveRequest.status !== 'pending') {
                return NextResponse.json({ error: 'Only pending requests can be edited' }, { status: 400 });
            }

            const updateData: any = {};
            if (body.type) updateData.type = body.type;
            if (body.reason) updateData.reason = body.reason;

            let startDate = body.startDate ? new Date(body.startDate) : leaveRequest.startDate;
            let endDate = body.endDate ? new Date(body.endDate) : leaveRequest.endDate;

            if (body.startDate) updateData.startDate = startDate;
            if (body.endDate) updateData.endDate = endDate;

            if (body.startDate || body.endDate) {
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                updateData.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            const updatedLeaveRequest = await LeaveRequest.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            )
                .populate('employee', 'name email employeeId')
                .populate('approvedBy', 'name email');


            return NextResponse.json({ leaveRequest: updatedLeaveRequest });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        if (status === 'rejected' && !rejectionReason) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        if (leaveRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Leave request has already been processed' }, { status: 400 });
        }

        const updatedLeaveRequest = await LeaveRequest.findByIdAndUpdate(
            id,
            {
                $set: {
                    status,
                    approvedBy: new mongoose.Types.ObjectId(user.id),
                    approvedAt: new Date(),
                    rejectionReason: status === 'rejected' ? rejectionReason : undefined
                }
            },
            { new: true, runValidators: true }
        )
            .populate('employee', 'name email employeeId')
            .populate('approvedBy', 'name email');


        return NextResponse.json({ leaveRequest: updatedLeaveRequest });
    } catch (error: any) {
        console.error('Error updating leave request:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const leaveRequest = await LeaveRequest.findById(id);
        if (!leaveRequest) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        // Check access - admin or own request (only if pending)
        if (user.role !== 'admin' && (leaveRequest.employee._id.toString() !== user.id || leaveRequest.status !== 'pending')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await LeaveRequest.findByIdAndDelete(id);


        return NextResponse.json({ message: 'Leave request cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling leave request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
