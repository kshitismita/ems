import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import jwt from 'jsonwebtoken';

const verifyToken = (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
        return null;
    }
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user: any = verifyToken(request); // Re-using existing verifyToken for consistency and functionality
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id } = await params; // Await params here
        const task = await Task.findById(id);

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const body = await request.json(); // Changed req to request


        // Permission check
        if (user.role === 'admin') {
            // Admins can update anything
            Object.assign(task, body);
        } else if (user.role === 'employee') {
            // Employees can only update status
            if (task.assignedTo.toString() !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (body.status) {
                task.status = body.status;
                if (body.status === 'completed') {
                    task.completedAt = new Date();
                }
            } else {
                return NextResponse.json({ error: 'Employees can only update task status' }, { status: 403 });
            }
        }

        await task.save();


        return NextResponse.json({ task });

    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user: any = verifyToken(request); // Re-using existing verifyToken for consistency and functionality
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const { id } = await params; // Await params here

        const deletedTask = await Task.findByIdAndDelete(id);

        if (!deletedTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Task deleted successfully' });

    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
