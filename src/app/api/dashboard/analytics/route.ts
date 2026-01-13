import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import DailyReport from '@/models/DailyReport';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

async function handleGetAnalytics(req: NextRequest, user: AuthUser) {
    try {
        await connectDB();

        // 1. Project Status Distribution
        const projectStatusData = await Project.aggregate([
            {
                $group: {
                    _id: "$status",
                    value: { $sum: 1 },
                    projects: {
                        $push: {
                            name: "$name",
                            progress: "$progress"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$_id", "active"] }, then: "Active" },
                                { case: { $eq: ["$_id", "planning"] }, then: "Planning" },
                                { case: { $eq: ["$_id", "on-hold"] }, then: "On Hold" },
                                { case: { $eq: ["$_id", "completed"] }, then: "Completed" },
                                { case: { $eq: ["$_id", "cancelled"] }, then: "Cancelled" }
                            ],
                            default: "Other"
                        }
                    },
                    value: 1,
                    projects: 1
                }
            }
        ]);

        // 2. Workforce Analytics (Active vs Inactive)
        const workforceData = await User.aggregate([
            {
                $group: {
                    _id: "$isActive",
                    value: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: { $cond: { if: { $eq: ["$_id", true] }, then: "Active Employees", else: "Inactive Employees" } },
                    value: 1
                }
            }
        ]);

        // 3. Report Trends (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const reportTrends = await DailyReport.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    count: 1
                }
            }
        ]);

        // 4. Project Deadline Analytics
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);

        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);

        const monthFromNow = new Date();
        monthFromNow.setMonth(now.getMonth() + 1);

        const allActiveProjects = await Project.find({
            status: { $in: ['active', 'planning'] }
        }).select('name deadline progress').lean();

        const deadlines = [
            { name: 'Overdue', value: 0 },
            { name: 'Due Today', value: 0 },
            { name: 'Due Soon (3 days)', value: 0 },
            { name: 'Due This Week', value: 0 },
            { name: 'Due This Month', value: 0 },
            { name: 'No Deadline', value: 0 }
        ];

        allActiveProjects.forEach((proj: any) => {
            if (!proj.deadline) {
                deadlines[5].value++;
                return;
            }

            const d = new Date(proj.deadline);
            d.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (d < today) {
                deadlines[0].value++;
            } else if (d.getTime() === today.getTime()) {
                deadlines[1].value++;
            } else if (d <= threeDaysFromNow) {
                deadlines[2].value++;
            } else if (d <= weekFromNow) {
                deadlines[3].value++;
            } else if (d <= monthFromNow) {
                deadlines[4].value++;
            }
        });

        // 5. Status Timeline (Attendance - last 7 days)
        const attendanceData = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    count: 1
                }
            }
        ]);

        return NextResponse.json({
            projectStatus: projectStatusData,
            workforceDistribution: workforceData,
            reportTrends: reportTrends,
            deadlineAnalytics: deadlines,
            statusTimeline: attendanceData
        });

    } catch (error: any) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}

export const GET = withAuth(handleGetAnalytics, 'admin');
