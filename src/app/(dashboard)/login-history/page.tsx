'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  ArrowUpDown,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalStorage } from '@/lib/storage';

interface LoginHistory {
  _id: string;
  email: string;
  loginTime: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

interface LoginStats {
  dailyStats: Array<{
    _id: string;
    successful: number;
    failed: number;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export default function LoginHistoryPage() {
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endTime: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const token = getLocalStorage('token');
    const userData = getLocalStorage('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      if (parsedUser.role !== 'admin') {
        router.push('/admin-dash');
        return;
      }

      fetchLoginHistory(token);
      fetchLoginStats(token);
    } catch (e) {
      console.error('Error parsing user data', e);
      router.push('/login');
    }
  }, [router]);

  const fetchLoginHistory = async (token: string, page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endTime && { endTime: filters.endTime }),
      });

      const response = await fetch(`/api/login-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.loginHistory);
        setTotalPages(data.pagination?.pages || 1);
        setLoading(false);
      } else {
        setError('Failed to fetch login history');
        setLoading(false);
      }
    } catch (error) {
      setError('An error occurred while fetching login history');
      setLoading(false);
    }
  };

  const fetchLoginStats = async (token: string) => {
    try {
      const response = await fetch('/api/login-history?stats=true&days=30', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch login stats:', error);
    }
  };

  const handleSearch = () => {
    const token = getLocalStorage('token');
    if (token) {
      setLoading(true);
      setCurrentPage(1);
      fetchLoginHistory(token, 1);
    }
  };

  const handlePageChange = (page: number) => {
    const token = getLocalStorage('token');
    if (token) {
      setCurrentPage(page);
      fetchLoginHistory(token, page);
    }
  };

  if (loading && !loginHistory.length) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Login History</h1>
            <p className="text-gray-400 mt-1">Monitor authentication attempts and security logs</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Attempts"
            value={stats?.summary.total || 0}
            icon={<Activity className="w-6 h-6" />}
            color="primary"
          />
          <StatsCard
            title="Successful"
            value={stats?.summary.successful || 0}
            icon={<CheckCircle2 className="w-6 h-6" />}
            color="emerald"
          />
          <StatsCard
            title="Failed"
            value={stats?.summary.failed || 0}
            icon={<XCircle className="w-6 h-6" />}
            color="red"
          />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm w-full lg:w-auto">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              placeholder="Search by user..."
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Table Card */}
        <Card className="overflow-hidden border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 font-semibold text-white">Timestamp</th>
                  <th className="text-left p-4 font-semibold text-white">User</th>
                  <th className="text-left p-4 font-semibold text-white">Status</th>
                  <th className="text-left p-4 font-semibold text-white">Device Info</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((login) => (
                  <tr key={login._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="text-sm text-gray-300">
                        {new Date(login.loginTime).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-primary font-bold text-xs">
                          {login.userId?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{login.userId?.name || 'Unknown User'}</div>
                          <div className="text-xs text-gray-500">{login.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        login.success
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      )}>
                        {login.success ? 'Success' : 'Failed'}
                      </span>
                      {!login.success && login.failureReason && (
                        <p className="text-[10px] text-gray-500 mt-1">{login.failureReason}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-gray-400 max-w-[200px] truncate" title={login.userAgent}>
                        {login.userAgent}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loginHistory.length === 0 && !loading && (
            <div className="py-16 text-center text-gray-500">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-lg font-medium text-gray-400">No login attempts found.</p>
              <p className="text-sm text-gray-500">Try adjusting your filters or search term.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
