import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';
import DailyReport from '@/models/DailyReport';
import Meeting from '@/models/Meeting';
import ReferenceLibrary from '@/models/ReferenceLibrary';
import LeaveRequest from '@/models/LeaveRequest';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

async function handleGetStats(req: NextRequest, user: AuthUser) {
    try {
        await connectDB();

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        if (user.role === 'admin') {
            // Admin Stats: Global counts
            const [
                totalEmployees,
                activeEmployees,
                totalProjects,
                activeProjects,
                totalReports,
                pendingReports,
                totalDocuments,
                totalMeetings,
                upcomingMeetings,
                totalLibItems,
                newLibItems,
                pendingLeaves
            ] = await Promise.all([
                User.countDocuments({ role: 'employee' }),
                User.countDocuments({ role: 'employee', isActive: true }),
                Project.countDocuments(),
                Project.countDocuments({ status: { $in: ['active', 'planning'] } }),
                DailyReport.countDocuments(),
                DailyReport.countDocuments({ status: 'submitted' }), // Matching DailyReport status enum
                ReferenceLibrary.countDocuments(),
                Meeting.countDocuments({ status: { $ne: 'cancelled' } }),
                Meeting.countDocuments({
                    startTime: { $gte: new Date() },
                    status: { $ne: 'cancelled' }
                }),
                ReferenceLibrary.countDocuments(),
                ReferenceLibrary.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }),
                LeaveRequest.countDocuments({ status: 'pending' })
            ]);

            return NextResponse.json({
                stats: {
                    employees: {
                        total: totalEmployees,
                        active: activeEmployees,
                        inactive: totalEmployees - activeEmployees
                    },
                    projects: {
                        total: totalProjects,
                        active: activeProjects
                    },
                    reports: {
                        total: totalReports,
                        pending: pendingReports
                    },
                    documents: totalDocuments,
                    meetings: {
                        total: totalMeetings,
                        upcoming: upcomingMeetings
                    },
                    library: {
                        total: totalLibItems,
                        new: newLibItems
                    },
                    pendingLeaves
                }
            });
        } else {
            // Employee Stats: User-specific focused counts
            const [
                myProjects,
                myActiveProjects,
                myMonthlyReports,
                myPendingReports,
                myUpcomingMeetings,
                myPendingLeaves,
                totalDocuments
            ] = await Promise.all([
                Project.countDocuments({ assignedEmployees: user.id }),
                Project.countDocuments({
                    assignedEmployees: user.id,
                    status: { $in: ['active', 'planning'] }
                }),
                DailyReport.countDocuments({
                    employee: user.id,
                    date: { $gte: startOfMonth }
                }),
                DailyReport.countDocuments({
                    employee: user.id,
                    status: 'submitted'
                }),
                Meeting.countDocuments({
                    attendees: user.id,
                    startTime: { $gte: new Date() },
                    status: { $ne: 'cancelled' }
                }),
                LeaveRequest.countDocuments({
                    employee: user.id,
                    status: 'pending'
                }),
                ReferenceLibrary.countDocuments({ isPublic: true })
            ]);

            return NextResponse.json({
                stats: {
                    projects: {
                        total: myProjects,
                        active: myActiveProjects
                    },
                    reports: {
                        total: myMonthlyReports, // Shows reports this month
                        pending: myPendingReports
                    },
                    meetings: {
                        total: myUpcomingMeetings,
                        upcoming: myUpcomingMeetings
                    },
                    documents: totalDocuments,
                    pendingLeaveRequests: myPendingLeaves,
                    pendingReports: myPendingReports,
                    upcomingMeetings: myUpcomingMeetings,
                    leaveRequests: {
                        pending: myPendingLeaves
                    }
                }
            });
        }
    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}

export const GET = withAuth(handleGetStats);
