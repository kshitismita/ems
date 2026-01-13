import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyReport from '@/models/DailyReport';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

async function handleGetReport(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = context.params;

    const report = await DailyReport.findById(id)
      .populate('employee', 'name email employeeId')
      .populate('project', 'name')
      .populate('reviewedBy', 'name email');

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Employees can only view their own reports
    if (user.role === 'employee' && report.employee._id.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      report,
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

async function handleUpdateReport(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = context.params;
    const { project, tasksCompleted, tasksInProgress, challenges, achievements, notes } = await req.json();

    const report = await DailyReport.findById(id);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Employees can only update their own reports
    if (user.role === 'employee' && report.employee.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Only allow updates for submitted or rejected reports
    if (!['submitted', 'rejected'].includes(report.status)) {
      return NextResponse.json(
        { error: 'Cannot update report in current status' },
        { status: 400 }
      );
    }

    const updatedReport = await DailyReport.findByIdAndUpdate(
      id,
      {
        project,
        tasksCompleted,
        tasksInProgress,
        challenges,
        achievements,
        notes,
        // Reset review status when updating
        status: 'submitted',
        feedback: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
      },
      { new: true }
    ).populate('employee', 'name email employeeId')
      .populate('project', 'name')
      .populate('reviewedBy', 'name email');

    return NextResponse.json({
      message: 'Report updated successfully',
      report: updatedReport,
    });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleGetReport(request, user, { params: { id } }))(req);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleUpdateReport(request, user, { params: { id } }))(req);
}
