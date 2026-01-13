'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, Building2, UserCheck, Briefcase, FileText, Calendar, TrendingUp, LogOut, Plus, MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';
import DashboardLayout from '@/components/dashboard/Layout';
import AuthGuard from '@/components/auth/AuthGuard';


import { cn } from '@/lib/utils';
import { TodoList } from '@/components/dashboard/TodoList';
import TodoErrorBoundary from '@/components/dashboard/TodoErrorBoundary';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  reportingAdmin?: {
    _id: string;
    name: string;
    email: string;
  };
}


interface EmployeeStats {
  totalTasks?: number;
  completedTasks?: number;
  pendingReports?: number;
  upcomingMeetings?: number;
  attendanceRate?: number;
  pendingLeaveRequests?: number;
  projects?: { total?: number };
  meetings?: { upcoming?: number };
  reports?: { total?: number };
  documents?: number;
}
export default function EmployeeDash() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<EmployeeStats>({});
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [deadlineNotifications, setDeadlineNotifications] = useState<any[]>([]);

  const fetchLatestFeedback = async (token: string) => {
    try {
      console.log('Employee Dashboard - Fetching latest feedback...');
      const response = await fetch('/api/daily-reports?limit=20&sortBy=date&sortOrder=desc', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Employee Dashboard - Feedback API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Employee Dashboard - Daily reports API response:', data);
        console.log('Employee Dashboard - Reports array:', data.reports);
        console.log('Employee Dashboard - Reports length:', data.reports?.length || 0);

        const reports = data.reports || [];
        console.log('Employee Dashboard - Processing reports for feedback...');

        // Log each report to see what we're working with
        reports.forEach((report: any, index: number) => {
          console.log(`Report ${index}:`, {
            id: report._id,
            date: report.date,
            feedback: report.feedback,
            hasFeedback: !!report.feedback,
            feedbackLength: report.feedback?.length || 0,
            status: report.status
          });
        });

        const reportWithFeedback = reports.find((r: any) => r.feedback && r.feedback.trim() !== '');

        console.log('Employee Dashboard - Report with feedback found:', reportWithFeedback);

        if (reportWithFeedback) {
          console.log('Employee Dashboard - Setting latest feedback:', reportWithFeedback);
          setFeedbacks([reportWithFeedback]);
        } else {
          console.log('Employee Dashboard - No feedback found in any reports');
          setFeedbacks([]);
        }
      } else {
        console.error('Employee Dashboard - Feedback API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Employee Dashboard - Error response body:', errorText);
      }
    } catch (error) {
      console.error('Employee Dashboard - Error fetching feedback', error);
      setFeedbacks([]);
    }
  };

  // Also try a simpler approach as fallback
  const fetchLatestFeedbackSimple = async (token: string) => {
    try {
      console.log('Employee Dashboard - Fetching feedbacks...');
      const response = await fetch('/api/daily-reports?hasFeedback=true&limit=5&sortBy=date&sortOrder=desc', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Employee Dashboard - Feedbacks response:', data);

        const reports = data.reports || [];
        setFeedbacks(reports);
      } else {
        console.error('Employee Dashboard - Feedbacks API error:', response.status);
      }
    } catch (error) {
      console.error('Employee Dashboard - Feedbacks fetch error:', error);
      setFeedbacks([]);
    }
  };

  const fetchLeaveRequests = async (token: string) => {
    try {
      const response = await fetch('/api/leave', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const pendingCount = data.leaveRequests?.filter((req: any) => req.status === 'pending').length || 0;
        setStats(prev => ({ ...prev, pendingLeaveRequests: pendingCount }));
      }
    } catch (error) {
      console.error('Employee Dashboard - Error fetching leave requests:', error);
    }
  };

  useEffect(() => {
    const token = getLocalStorage('token');
    const userRaw = getLocalStorage('user');

    if (token && userRaw) {
      try {
        const parsedUser = JSON.parse(userRaw);
        setUser(parsedUser);

        fetchEmployeeStats(token);
        fetchLatestFeedbackSimple(token); // Use the simple version
        fetchLeaveRequests(token);
        fetchMyProjects(token);
      } catch (error) {
        console.error('Employee Dashboard - Error parsing user data', error);
        setLoading(false);
      }
    } else {
      // AuthGuard handles redirect to /login
      setLoading(false);
    }
  }, [router]);

  const fetchMyProjects = async (token: string) => {
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const projects = data.projects || [];

        // Check for deadline notifications (3 days or less)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const notifications = projects
          .filter(project => project.deadline)
          .map(project => {
            const deadline = new Date(project.deadline);
            deadline.setHours(0, 0, 0, 0);

            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Only notify if 3 days or less remaining
            if (diffDays >= 0 && diffDays <= 3) {
              return {
                id: project._id,
                projectName: project.name,
                deadline: project.deadline,
                daysRemaining: diffDays,
                urgency: diffDays === 0 ? 'due-today' : diffDays === 1 ? 'due-tomorrow' : 'due-soon'
              };
            }
            return null;
          })
          .filter(notification => notification !== null);

        setDeadlineNotifications(notifications);
      }
    } catch (error) {
      console.error('Employee Dashboard - Error fetching projects', error);
    }
  };

  const fetchEmployeeStats = async (token: string) => {
    try {
      // Fetch real employee stats from APIs
      const [statsResponse, tasksResponse, attendanceResponse] = await Promise.all([
        fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/attendance', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      let realStats: EmployeeStats = {};

      // Get dashboard stats
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        realStats = {
          ...realStats,
          ...statsData.stats
        };
      }

      // Get task counts
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const tasks = tasksData.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task: any) => task.status === 'done' || task.status === 'completed').length;

        realStats = {
          ...realStats,
          totalTasks,
          completedTasks
        };
      }

      // Calculate attendance rate
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        const attendanceRecords = attendanceData.attendance || [];

        // Get current month's attendance
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const currentMonthAttendance = attendanceRecords.filter((record: any) => {
          const recordDate = new Date(record.date);
          return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

        // Calculate working days in current month (excluding weekends)
        const today = new Date();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let workingDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentYear, currentMonth, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
            workingDays++;
          }
        }

        // Calculate attendance rate
        const presentDays = currentMonthAttendance.filter((record: any) =>
          record.status === 'present' || record.status === 'work-from-home'
        ).length;

        const attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

        realStats = {
          ...realStats,
          attendanceRate
        };
      }

      console.log('Employee Dashboard - Combined Stats:', realStats);
      setStats(realStats);
      setLoading(false);
    } catch (error) {
      console.error('Employee Dashboard - Error fetching stats', error);
      setLoading(false);
    }
  };


  // Helper functions
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const formatMeetingTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogout = () => {
    removeLocalStorage('token');
    removeLocalStorage('user');
    router.replace('/login');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <AuthGuard allowedRoles={['employee']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">Employee Dashboard</h1>
                <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user?.name}</p>
              </div>
            </div>
          </div>

          {/* Deadline Notifications */}
          {deadlineNotifications.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-orange-400 mb-1">
                    {deadlineNotifications.length === 1
                      ? 'Project Deadline Approaching'
                      : `${deadlineNotifications.length} Project Deadlines Approaching`}
                  </h4>
                  <div className="space-y-2">
                    {deadlineNotifications.map((notification) => (
                      <div key={notification.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            <span className="text-orange-400">{notification.projectName}</span>
                            {notification.daysRemaining === 0 ? (
                              <span className="text-red-400"> is due today!</span>
                            ) : notification.daysRemaining === 1 ? (
                              <span className="text-orange-300"> is due tomorrow!</span>
                            ) : (
                              <span className="text-orange-300"> has {notification.daysRemaining} days remaining</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/projects/${notification.id}`)}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          View Project
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Projects"
              value={stats.projects?.total || 0}
              subValue="Assigned to you"
              color="purple"
              icon={<Building2 className="w-5 h-5" />}
              trend="neutral"
              trendValue="Active"
              onClick={() => router.push('/projects')}
            />
            <StatsCard
              title="Tasks"
              value={stats.totalTasks || 0}
              subValue={`${stats.completedTasks || 0} completed`}
              color="primary"
              icon={<Briefcase className="w-5 h-5" />}
              trend="up"
              trendValue="+2 this week"
              onClick={() => router.push('/tasks')}
            />
            <StatsCard
              title="Upcoming Meetings"
              value={stats.meetings?.upcoming || 0}
              subValue="This week"
              color="blue"
              icon={<Calendar className="w-5 h-5" />}
              trend="up"
              trendValue="+1 new"
              onClick={() => router.push('/meetings')}
            />
            <StatsCard
              title="Pending Leave"
              value={stats.pendingLeaveRequests || 0}
              subValue="Awaiting approval"
              color="orange"
              icon={<MessageSquare className="w-5 h-5" />}
              trend="neutral"
              trendValue="Apply for leave"
              onClick={() => router.push('/leave/apply')}
            />
            <StatsCard
              title="Reports"
              value={stats.reports?.total || 0}
              subValue="This month"
              color="blue"
              icon={<FileText className="w-5 h-5" />}
              trend="up"
              trendValue="+1 new"
              onClick={() => router.push('/reports')}
            />
                        <StatsCard
              title="Attendance Rate"
              value={`${stats.attendanceRate || 0}%`}
              subValue="This month"
              color="emerald"
              icon={<TrendingUp className="w-5 h-5" />}
              trend={stats.attendanceRate > 80 ? "up" : stats.attendanceRate > 60 ? "neutral" : "down"}
              trendValue={stats.attendanceRate > 80 ? "Excellent" : stats.attendanceRate > 60 ? "Good" : "Needs improvement"}
              onClick={() => router.push('/attendance')}
            />
            <StatsCard
              title="Reference Library"
              value={stats.documents || 0}
              subValue="Available"
              color="indigo"
              icon={<Users className="w-5 h-5" />}
              trend="neutral"
              trendValue="Browse"
              onClick={() => router.push('/reference-library')}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* To-Do List */}
            <div className="lg:col-span-1 h-full">
              <TodoErrorBoundary>
                <TodoList />
              </TodoErrorBoundary>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-1">
              <RecentActivity token={getLocalStorage('token') || ''} />
            </div>

            {/* Latest Feedback */}
            <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Latest Feedback
                </h3>
                {feedbacks.length > 0 && (
                  <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg uppercase tracking-wider">
                    {feedbacks.length} New Review{feedbacks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                {feedbacks.length > 0 ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 max-h-[400px]">
                    {feedbacks.map((feedback, index) => (
                      <div key={feedback._id} className={cn(
                        "space-y-4 pb-6",
                        index !== feedbacks.length - 1 && "border-b border-white/5"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{feedback.reviewedBy?.name || 'Admin'}</p>
                              <p className="text-xs text-gray-500">Reviewer</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            {feedback.status === 'approved' ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">Approved</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span className="text-[10px] font-bold text-rose-400 uppercase">Action Needed</span>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-500">
                              {new Date(feedback.reviewedAt || feedback.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 italic relative">
                          <p className="text-sm text-gray-300 leading-relaxed">
                            "{feedback.feedback}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Report for {new Date(feedback.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                          <button
                            onClick={() => router.push(`/reports`)}
                            className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1.5"
                          >
                            View Report
                            <Plus className="w-3.5 h-3.5 rotate-45" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-3 opacity-50">
                    <MessageSquare className="w-8 h-8 text-gray-600" />
                    <p className="text-sm text-gray-400">No feedback received yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
