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

async function handleReviewReport(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = context.params;
    const { status, feedback } = await req.json();

    console.log('Review Report API - ID:', id);
    console.log('Review Report API - Status:', status);
    console.log('Review Report API - Feedback:', feedback);
    console.log('Review Report API - User Role:', user.role);

    if (user.role !== 'admin') {
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

    console.log('Review Report API - Current Report Status:', report.status);

    // We allow re-reviewing/updating feedback
    /*
    if (report.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Report has already been reviewed' },
        { status: 400 }
      );
    }
    */

    // Determine status based on whether feedback is provided
    const finalStatus = feedback && feedback.trim() ? 'reviewed' : 'approved';
    
    console.log('Review Report API - Updating report with:', { status: finalStatus, feedback, reviewedBy: user.id });

    const updatedReport = await DailyReport.findByIdAndUpdate(
      id,
      {
        status: finalStatus,
        feedback,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
      { new: true }
    ).populate('employee', 'name email employeeId')
      .populate('reviewedBy', 'name email');

    console.log('Review Report API - Updated Report Status:', updatedReport?.status);

    return NextResponse.json({
      message: 'Report reviewed successfully',
      report: updatedReport,
    });
  } catch (error) {
    console.error('Review report error:', error);
    return NextResponse.json(
      { error: 'Failed to review report' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleReviewReport(request, user, { params: { id } }))(req);
}
