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

async function handleResubmitReport(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = context.params;

    if (user.role !== 'employee') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const report = await DailyReport.findById(id);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check if the report belongs to the current employee
    if (report.employee.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Access denied - you can only resubmit your own reports' },
        { status: 403 }
      );
    }

    // Check if the report is rejected
    if (report.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Only rejected reports can be resubmitted' },
        { status: 400 }
      );
    }

    // Reset the report status to submitted and clear review fields
    const updatedReport = await DailyReport.findByIdAndUpdate(
      id,
      {
        status: 'submitted',
        feedback: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
      },
      { new: true }
    ).populate('employee', 'name email employeeId')
      .populate('reviewedBy', 'name email');

    return NextResponse.json({
      message: 'Report resubmitted successfully',
      report: updatedReport,
    });
  } catch (error) {
    console.error('Resubmit report error:', error);
    return NextResponse.json(
      { error: 'Failed to resubmit report' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleResubmitReport(request, user, { params: { id } }))(req);
}
