import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Meeting from '@/models/Meeting';
import Task from '@/models/Task';
import Attendance from '@/models/Attendance';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

interface Activity {
    id: string;
    type: 'project' | 'meeting' | 'attendance' | 'task' | 'deadline';
    title: string;
    description: string;
    timestamp: Date;
    metadata?: any;
}

async function handleGetActivity(req: NextRequest, user: AuthUser) {
    try {
        await connectDB();

        const activities: Activity[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Recent Project Assignments
        const recentProjects = await Project.find({
            assignedEmployees: user.id,
            updatedAt: { $gte: sevenDaysAgo }
        })
            .select('name status updatedAt createdAt')
            .sort({ updatedAt: -1 })
            .limit(5)
            .lean();

        recentProjects.forEach((project: any) => {
            const isNew = new Date(project.createdAt) >= sevenDaysAgo;
            activities.push({
                id: `project-${project._id}`,
                type: 'project',
                title: isNew ? 'New Project Assignment' : 'Project Updated',
                description: `${project.name} - Status: ${project.status}`,
                timestamp: new Date(project.updatedAt),
                metadata: { projectId: project._id, projectName: project.name }
            });
        });

        // 2. Upcoming Meetings (next 7 days)
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const upcomingMeetings = await Meeting.find({
            attendees: user.id,
            startTime: { $gte: now, $lte: sevenDaysFromNow },
            status: { $in: ['scheduled', 'ongoing'] }
        })
            .select('title startTime location meetingLink')
            .sort({ startTime: 1 })
            .limit(5)
            .lean();

        upcomingMeetings.forEach((meeting: any) => {
            const meetingDate = new Date(meeting.startTime);
            const isToday = meetingDate.toDateString() === now.toDateString();
            const isTomorrow = meetingDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

            let timeDesc = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : meetingDate.toLocaleDateString();

            activities.push({
                id: `meeting-${meeting._id}`,
                type: 'meeting',
                title: 'Upcoming Meeting',
                description: `${meeting.title} - ${timeDesc} at ${meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                timestamp: meetingDate,
                metadata: { meetingId: meeting._id, location: meeting.location, link: meeting.meetingLink }
            });
        });

        // 3. Recent Task Assignments
        const recentTasks = await Task.find({
            assignedTo: user.id,
            createdAt: { $gte: sevenDaysAgo }
        })
            .select('title status priority createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        recentTasks.forEach((task: any) => {
            activities.push({
                id: `task-${task._id}`,
                type: 'task',
                title: 'New Task Assigned',
                description: `${task.title} - Priority: ${task.priority}`,
                timestamp: new Date(task.createdAt),
                metadata: { taskId: task._id, priority: task.priority, status: task.status }
            });
        });

        // 4. Recent Attendance
        const recentAttendance = await Attendance.find({
            employee: user.id,
            date: { $gte: sevenDaysAgo }
        })
            .select('date checkIn checkOut status')
            .sort({ date: -1 })
            .limit(3)
            .lean();

        recentAttendance.forEach((record: any) => {
            const checkInTime = record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            activities.push({
                id: `attendance-${record._id}`,
                type: 'attendance',
                title: 'Attendance Recorded',
                description: `Check-in: ${checkInTime} - Status: ${record.status}`,
                timestamp: new Date(record.date),
                metadata: { status: record.status, checkIn: record.checkIn, checkOut: record.checkOut }
            });
        });

        // 5. Approaching Project Deadlines
        const projectsWithDeadlines = await Project.find({
            assignedEmployees: user.id,
            deadline: { $gte: now, $lte: sevenDaysFromNow },
            status: { $in: ['active', 'planning'] }
        })
            .select('name deadline progress')
            .sort({ deadline: 1 })
            .limit(5)
            .lean();

        projectsWithDeadlines.forEach((project: any) => {
            const deadline = new Date(project.deadline);
            const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            let urgency = daysRemaining === 0 ? 'Due Today!' :
                daysRemaining === 1 ? 'Due Tomorrow' :
                    `Due in ${daysRemaining} days`;

            activities.push({
                id: `deadline-${project._id}`,
                type: 'deadline',
                title: 'Project Deadline Approaching',
                description: `${project.name} - ${urgency} (${project.progress}% complete)`,
                timestamp: deadline,
                metadata: { projectId: project._id, daysRemaining, progress: project.progress }
            });
        });

        // Sort all activities by timestamp (most recent first)
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Limit to 20 most recent activities
        const recentActivities = activities.slice(0, 20);

        return NextResponse.json({ activities: recentActivities });

    } catch (error: any) {
        console.error('Activity API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}

export const GET = withAuth(handleGetActivity, 'employee');
