'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  employeeId?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface DashboardStats {
  employees?: { total: number; active: number };
  projects?: { total: number; active: number };
  reports?: { total: number; pending: number };
  documents?: number;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Report {
  _id: string;
  status: string;
  submittedAt: string;
  employee?: {
    name: string;
    email: string;
    employeeId?: string;
  };
  date?: string;
  tasksCompleted?: string[];
  tasksInProgress?: string[];
  challenges?: string[];
  achievements?: string[];
  notes?: string;
}

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentEmployees, setRecentEmployees] = useState<Employee[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  /** -------------------------------
   *  Auth + Bootstrap
   *  ------------------------------- */
  useEffect(() => {
    const token = getLocalStorage('token');
    const userRaw = getLocalStorage('user');

    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser: User = JSON.parse(userRaw);
      setUser(parsedUser);
      bootstrap(token, parsedUser.role);
    } catch (error) {
      console.error('User data parse error:', error);
      // Don't logout on parse error, just show error state
      setLoading(false);
    }
  }, []);

  const bootstrap = async (token: string, role: User['role']) => {
    try {
      await Promise.all([
        fetchStats(token),
        fetchReports(token, role),
        role === 'admin' ? fetchEmployees(token) : Promise.resolve(),
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Dashboard bootstrap error:', error);
      // Don't logout on bootstrap error, just set loading to false
      setLoading(false);
    }
  };

  /** -------------------------------
   *  API Calls
   *  ------------------------------- */
  const authFetch = async (url: string, token: string) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      // Don't auto-redirect, just return error data
      throw new Error('Unauthorized');
    }

    return res.json();
  };

  const fetchStats = async (token: string) => {
    const data = await authFetch('/api/dashboard/stats', token);
    setStats(data.stats ?? {});
  };

  const fetchEmployees = async (token: string) => {
    const data = await authFetch('/api/employees?limit=5', token);
    setRecentEmployees(data.employees ?? []);
  };

  const fetchReports = async (token: string, role: User['role']) => {
    const endpoint =
      role === 'admin'
        ? '/api/daily-reports?status=submitted&limit=5'
        : '/api/daily-reports?limit=5';

    const data = await authFetch(endpoint, token);
    setPendingReports(data.reports ?? []);
  };

  /** -------------------------------
   *  Logout
   *  ------------------------------- */
  const handleLogout = () => {
    removeLocalStorage('token');
    removeLocalStorage('user');
    router.replace('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /** -------------------------------
   *  Loading
   *  ------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  /** -------------------------------
   *  Render
   *  ------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'USER'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div>
          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {user?.role === 'admin' && (
              <>
                <a
                  href="/employees/create"
                  className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Employee
                </a>
                <a
                  href="/projects/create"
                  className="flex items-center justify-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Project
                </a>
              </>
            )}
            <a
              href="/reports/create"
              className="flex items-center justify-center p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Submit Report
            </a>
            <a
              href="/documents"
              className="flex items-center justify-center p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Documents
            </a>
          {user?.role === 'admin' && (
              <a
                href="/login-history"
                className="flex items-center justify-center p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Login History
              </a>
            )}
          </div>

        {/* Stats Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {user?.role === 'admin' && (
            <>
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Employees</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-gray-900">{stats.employees?.total || 0}</p>
                  <p className="text-sm text-gray-500">{stats.employees?.active || 0} active</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Projects</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-gray-900">{stats.projects?.total || 0}</p>
                  <p className="text-sm text-gray-500">{stats.projects?.active || 0} active</p>
                </div>
              </div>
            </>
          )}

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Reports</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">{stats.reports?.total || 0}</p>
              <p className="text-sm text-gray-500">{stats.reports?.pending || 0} pending</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Documents</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">{stats.documents || 0}</p>
              <p className="text-sm text-gray-500">Uploaded</p>
            </div>
          </div>
          </div>

          {/* Submitted Reports Section */}
          {user?.role === 'admin' && (
            <div className="mt-8">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m3-2V8a2 2 0 00-2-2H8a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Submitted Reports
                  </h3>
                  <a href="/reports/submitted" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                  </a>
                </div>

                <div className="space-y-4">
                  {pendingReports.filter(report => report.status === 'submitted').map((report) => (
                    <div key={report._id} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{report.employee?.name || 'Unknown Employee'}</h4>
                          <p className="text-sm text-gray-500">{report.employee?.email || 'No email'}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {report.employee?.employeeId || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p className="font-medium text-gray-900 mb-1">Date: {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}</p>
                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-500">Tasks Completed:</span>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {(report.tasksCompleted || []).map((task: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-green-500 mr-2">✓</span>
                                  <span>{task}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-gray-500">Tasks In Progress:</span>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {(report.tasksInProgress || []).map((task: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-yellow-500 mr-2">⏳</span>
                                  <span>{task}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-gray-500">Challenges:</span>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {(report.challenges || []).map((challenge: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-red-500 mr-2">⚠</span>
                                  <span>{challenge}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-gray-500">Achievements:</span>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {(report.achievements || []).map((achievement: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-blue-500 mr-2">🏆</span>
                                  <span>{achievement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {report.notes && (
                            <div>
                              <span className="text-gray-500">Notes:</span>
                              <p className="text-sm text-gray-600 mt-1">{report.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
