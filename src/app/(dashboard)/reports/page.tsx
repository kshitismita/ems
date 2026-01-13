'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import {
  FileText, Search, Filter, Calendar,
  CheckCircle2, Clock, AlertTriangle,
  MessageSquare, User as UserIcon, Briefcase,
  ArrowUpRight, ChevronRight, Plus, File, Download, Loader2,
  X, RefreshCw, BarChart3, TrendingUp, Users
} from 'lucide-react';
import { FeedbackModal } from '@/components/dashboard/FeedbackModal';

interface DailyReport {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
  };
  date: string;
  tasksCompleted: string[];
  tasksInProgress: string[];
  challenges: string[];
  notes?: string;
  project: {
    _id: string;
    name: string;
  };
  status: string;
  submittedAt: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  feedback?: string;
  attachments?: Array<{
    url: string;
    public_id: string;
    name: string;
    size: number;
    resource_type: string;
    format: string;
  }>;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    employee: '',
    project: '',
    search: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [projects, setProjects] = useState<{ _id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'project' | 'employee'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [viewMode, setViewMode] = useState<'table'>('table');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; reportId: string; status: string; initialFeedback: string; mode: 'review' | 'approve' }>({
    isOpen: false,
    reportId: '',
    status: '',
    initialFeedback: '',
    mode: 'review'
  });
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    fetchReports(token);
    if (parsedUser.role === 'admin') {
      fetchFilters(token);
    }
  }, [router]);

  // Auto-fetch reports when filters change
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsFiltering(true);
      const timeoutId = setTimeout(() => {
        fetchReports(token);
      }, 300); // Debounce for 300ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters.status, filters.dateFrom, filters.dateTo, filters.employee, filters.project, filterMode, filters.search, filters.sortBy, filters.sortOrder]);

  const fetchFilters = async (token: string) => {
    try {
      const [projRes, empRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/employees', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchReports = async (token: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      // Only admins can filter by employee or project
      if (user?.role === 'admin') {
        if (filterMode === 'employee' && filters.employee) {
          params.append('employee', filters.employee);
        } else if (filterMode === 'project' && filters.project) {
          params.append('project', filters.project);
        }
      }

      const response = await fetch(`/api/daily-reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      } else {
        setError('Failed to fetch reports');
      }
    } catch (error) {
      setError('An error occurred while fetching reports');
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  const handleReview = async (reportId: string, status: string, feedback?: string) => {
    const token = localStorage.getItem('token');

    console.log('Frontend Review - Report ID:', reportId);
    console.log('Frontend Review - Status:', status);
    console.log('Frontend Review - Feedback:', feedback);

    try {
      const response = await fetch(`/api/daily-reports/${reportId}/review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, feedback }),
      });

      console.log('Frontend Review - Response Status:', response.status);
      console.log('Frontend Review - Response OK:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Frontend Review - Response Data:', data);

        setReports(reports.map(report =>
          report._id === reportId
            ? { ...report, status, feedback, reviewedBy: user, reviewedAt: new Date().toISOString() }
            : report
        ));
      } else {
        const errorData = await response.json();
        console.log('Frontend Review - Error Data:', errorData);
        setError('Failed to update report');
      }
    } catch (error) {
      console.error('Frontend Review - Error:', error);
      setError('An error occurred while updating the report');
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      employee: '',
      project: '',
      search: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setFilterMode('all');
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const reportColumns: Array<{
    key: keyof DailyReport;
    label: string;
    sortable: boolean;
    render: (value: any) => any;
  }> = [
    {
      key: 'employee',
      label: 'Employee',
      sortable: true,
      render: (value: any) => value?.name || 'N/A'
    },
    {
      key: 'project',
      label: 'Project',
      sortable: true,
      render: (value: any) => value?.name || 'Unassigned'
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={cn(
          "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border",
          getStatusStyles(value)
        )}>
          {value}
        </span>
      )
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'reviewed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {user?.role === 'admin' ? 'Daily Status Reports' : 'My Daily Reports'}
            </h1>
            <p className="text-gray-300 mt-1">
              {user?.role === 'admin'
                ? 'Track progress and challenges across the team'
                : 'Track your daily progress and challenges'
              }
            </p>
          </div>
          {user?.role === 'employee' && (
            <Link
              href="/reports/create"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              <Plus className="w-5 h-5" />
              Submit New Report
            </Link>
          )}
        </div>

        {/* Enhanced Filters Section */}
        <Card className="border-white/5 bg-white/[0.02]">
          <div className="p-6">
            {/* Filter Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Filters & Search</h2>
                  <p className="text-xs text-gray-500">
                    {getActiveFiltersCount() > 0 ? `${getActiveFiltersCount()} active filter${getActiveFiltersCount() > 1 ? 's' : ''}` : 'No active filters'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-all border border-white/10"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-all border border-white/10"
                >
                  <BarChart3 className="w-4 h-4" />
                  {showAdvancedFilters ? 'Simple' : 'Advanced'}
                </button>
              </div>
            </div>

            {/* Search and Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none"
                >
                  <option value="" className="bg-gray-900">All Statuses</option>
                  <option value="submitted" className="bg-gray-900">Submitted</option>
                  <option value="reviewed" className="bg-gray-900">Reviewed</option>
                  <option value="approved" className="bg-gray-900">Approved</option>
                </select>
              </div>

              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  placeholder="From date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  placeholder="To date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t border-white/5 pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sort By */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 ml-1">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                    >
                      <option value="date" className="bg-gray-900">Date</option>
                      <option value="status" className="bg-gray-900">Status</option>
                      <option value="employee" className="bg-gray-900">Employee Name</option>
                      <option value="project" className="bg-gray-900">Project</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 ml-1">Sort Order</label>
                    <select
                      value={filters.sortOrder}
                      onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                    >
                      <option value="desc" className="bg-gray-900">Descending</option>
                      <option value="asc" className="bg-gray-900">Ascending</option>
                    </select>
                  </div>

                  {/* Admin-specific filters */}
                  {user?.role === 'admin' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500 ml-1">Filter Mode</label>
                      <select
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                      >
                        <option value="all" className="bg-gray-900">All Reports</option>
                        <option value="project" className="bg-gray-900">By Project</option>
                        <option value="employee" className="bg-gray-900">By Employee</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Project/Employee Selection */}
                {user?.role === 'admin' && filterMode !== 'all' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filterMode === 'project' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 ml-1">Select Project</label>
                        <select
                          value={filters.project}
                          onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="" className="bg-gray-900">Choose Project...</option>
                          {projects.map(p => (
                            <option key={p._id} value={p._id} className="bg-gray-900">{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {filterMode === 'employee' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 ml-1">Select Employee</label>
                        <select
                          value={filters.employee}
                          onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="" className="bg-gray-900">Choose Employee...</option>
                          {employees.map(e => (
                            <option key={e._id} value={e._id} className="bg-gray-900">{e.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Filter Status Indicator */}
            {isFiltering && (
              <div className="flex items-center gap-2 mt-4 text-xs text-primary">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Applying filters...
              </div>
            )}
          </div>
        </Card>

        {/* Reports Feed */}
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {loading ? 'Loading Reports...' : `${reports.length} Report${reports.length !== 1 ? 's' : ''}`}
              </h3>
              {getActiveFiltersCount() > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Showing filtered results
                </p>
              )}
            </div>
            {successMessage && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 text-sm font-medium">{successMessage}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-b-primary rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Fetching reports...</p>
            </div>
          ) : reports.length > 0 ? (
            <DataTable
              data={reports}
              columns={reportColumns}
              onRowClick={(report) => {
                setSelectedReport(report);
                setShowDetailsModal(true);
              }}
              searchable={false} // Search is handled by filters above
              emptyMessage="No reports found"
            />
          ) : (
            <Card className="p-12 text-center border-white/5 bg-white/[0.02] border-dashed">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No reports found</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                No daily reports match your current filters. Try adjusting them or check back later.
              </p>
            </Card>
          )}
        </div>
        </div>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={feedbackModal.isOpen}
          onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
          reportId={feedbackModal.reportId}
          initialFeedback={feedbackModal.initialFeedback}
          mode={feedbackModal.mode}
          onSubmit={async (feedback) => {
            await handleReview(feedbackModal.reportId, feedbackModal.status, feedback);
          }}
        />

        {/* Report Details Modal */}
        {showDetailsModal && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}></div>
            <div className="relative bg-card border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h2 className="text-xl font-bold text-white">Report Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Report Header */}
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-white">{selectedReport.employee?.name}</h3>
                        <span className={cn(
                          "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border",
                          getStatusStyles(selectedReport.status)
                        )}>
                          {selectedReport.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                          {selectedReport.project?.name || 'Unassigned'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {new Date(selectedReport.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Submitted On</div>
                    <div className="text-sm text-gray-400 font-medium">
                      {new Date(selectedReport.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Detailed Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Completed Tasks */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Completed Tasks</span>
                    </div>
                    <ul className="space-y-2">
                      {selectedReport.tasksCompleted.map((task, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500/50 mt-1.5 shrink-0" />
                          {task}
                        </li>
                      ))}
                      {selectedReport.tasksCompleted.length === 0 && <li className="text-xs text-gray-600 italic">No tasks listed</li>}
                    </ul>
                  </div>

                  {/* In Progress Tasks */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Clock className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
                    </div>
                    <ul className="space-y-2">
                      {selectedReport.tasksInProgress.map((task, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-1.5 shrink-0" />
                          {task}
                        </li>
                      ))}
                      {selectedReport.tasksInProgress.length === 0 && <li className="text-xs text-gray-600 italic">No tasks listed</li>}
                    </ul>
                  </div>

                  {/* Challenges */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Challenges</span>
                    </div>
                    <ul className="space-y-2">
                      {selectedReport.challenges.map((challenge, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 mt-1.5 shrink-0" />
                          {challenge}
                        </li>
                      ))}
                      {selectedReport.challenges.length === 0 && <li className="text-xs text-gray-600 italic">None reported</li>}
                    </ul>
                  </div>

                </div>

                {/* Notes & Feedback */}
                {(selectedReport.notes || selectedReport.feedback) && (
                  <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {selectedReport.notes && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Additional Notes</span>
                        <p className="text-sm text-gray-400 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
                          {selectedReport.notes}
                        </p>
                      </div>
                    )}
                    {selectedReport.feedback && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Feedback</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600 italic">By {selectedReport.reviewedBy?.name}</span>
                            {selectedReport.reviewedAt && (
                              <>
                                <span className="text-gray-800">•</span>
                                <span className="text-[10px] text-gray-600 italic">
                                  {new Date(selectedReport.reviewedAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-primary/80 leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10">
                          {selectedReport.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Attachments</span>
                    <div className="mt-3 space-y-2">
                      {selectedReport.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">{attachment.name}</p>
                              <p className="text-xs text-gray-500">
                                {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.resource_type}
                              </p>
                            </div>
                          </div>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                {user?.role === 'admin' && (
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-3">
                    {selectedReport.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => {
                            setShowDetailsModal(false);
                            setFeedbackModal({
                              isOpen: true,
                              reportId: selectedReport._id,
                              status: 'approved',
                              initialFeedback: '',
                              mode: 'approve'
                            });
                          }}
                          className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold rounded-lg hover:bg-green-500/20 transition-all flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Without Feedback
                        </button>
                        <button
                          onClick={() => {
                            setShowDetailsModal(false);
                            setFeedbackModal({
                              isOpen: true,
                              reportId: selectedReport._id,
                              status: 'reviewed',
                              initialFeedback: selectedReport.feedback || '',
                              mode: 'review'
                            });
                          }}
                          className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 text-xs font-bold rounded-lg hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          {selectedReport.feedback ? 'Edit Feedback' : 'Add Feedback'}
                        </button>
                      </>
                    )}
                    
                    {(selectedReport.status === 'approved' || selectedReport.status === 'reviewed') && (
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          setFeedbackModal({
                            isOpen: true,
                            reportId: selectedReport._id,
                            status: selectedReport.status,
                            initialFeedback: selectedReport.feedback || '',
                            mode: selectedReport.status === 'approved' ? 'approve' : 'review'
                          });
                        }}
                        className="px-4 py-2 bg-white/5 text-gray-300 border border-white/10 text-xs font-bold rounded-lg hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        {selectedReport.feedback ? 'Edit Feedback' : 'Add Feedback'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
