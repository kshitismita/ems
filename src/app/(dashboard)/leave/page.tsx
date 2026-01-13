'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Filter,
  Search,
  AlertCircle,
  Mail,
  Phone,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalStorage } from '@/lib/storage';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

interface LeaveRequest {
  _id: string;
  type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
}

const leaveTypes = [
  { value: 'sick', label: 'Sick Leave', color: 'red' },
  { value: 'vacation', label: 'Vacation', color: 'blue' },
  { value: 'personal', label: 'Personal Leave', color: 'purple' },
  { value: 'maternity', label: 'Maternity Leave', color: 'pink' },
  { value: 'paternity', label: 'Paternity Leave', color: 'cyan' },
  { value: 'bereavement', label: 'Bereavement Leave', color: 'gray' },
  { value: 'unpaid', label: 'Unpaid Leave', color: 'orange' }
];

export default function LeavePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  useEffect(() => {
    const token = getLocalStorage('token');
    const userData = getLocalStorage('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchLeaveRequests(token);
  }, [router]);

  const fetchLeaveRequests = async (token: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/leave?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getLocalStorage('token');
    if (token) fetchLeaveRequests(token);
  }, [filters.status, filters.type, filters.search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    const leaveType = leaveTypes.find(lt => lt.value === type);
    return leaveType?.color || 'gray';
  };

  const handleApproveReject = async (requestId: string, status: 'approved' | 'rejected') => {
    const token = getLocalStorage('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/leave/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Refresh the leave requests
        fetchLeaveRequests(token);
        // Close the drawer
        setShowDetailsDrawer(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update leave request');
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      alert('An error occurred while updating the leave request');
    }
  };

  const leaveColumns = [
    {
      key: 'employee' as keyof LeaveRequest,
      label: 'Employee Name',
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary text-xs font-medium">
              {value?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-white font-medium">{value?.name || 'N/A'}</div>
            <div className="text-gray-500 text-xs">{value?.employeeId || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status' as keyof LeaveRequest,
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={cn(
          "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border",
          getStatusColor(value)
        )}>
          {value}
        </span>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Leave Requests</h1>
            <p className="text-gray-300 mt-1">
              Track your leave requests and their approval status
            </p>
          </div>
          <Link
            href="/leave/apply"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
          >
            <Plus className="w-5 h-5" />
            Apply for Leave
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-6 border-white/5 bg-white/[0.02]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search leave requests..."
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
                <option value="pending" className="bg-gray-900">Pending</option>
                <option value="approved" className="bg-gray-900">Approved</option>
                <option value="rejected" className="bg-gray-900">Rejected</option>
                <option value="cancelled" className="bg-gray-900">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none"
              >
                <option value="" className="bg-gray-900">All Types</option>
                {leaveTypes.map(type => (
                  <option key={type.value} value={type.value} className="bg-gray-900">{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-b-primary rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Fetching leave requests...</p>
          </div>
        ) : leaveRequests.length > 0 ? (
          <div className="relative">
            <DataTable
              data={leaveRequests}
              columns={leaveColumns}
              onRowClick={(request) => {
                setSelectedRequest(request);
                setShowDetailsDrawer(true);
              }}
              searchable={false}
              emptyMessage="No leave requests found"
              className="hover-row cursor-pointer"
            />
            
            {/* Sliding Drawer for Details */}
            {showDetailsDrawer && selectedRequest && (
              <div className="fixed inset-0 z-50 flex">
                {/* Backdrop */}
                <div 
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setShowDetailsDrawer(false)}
                />
                
                {/* Drawer */}
                <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out">
                  <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg text-white",
                            `bg-${getLeaveTypeColor(selectedRequest.type)}-500`
                          )}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {leaveTypes.find(lt => lt.value === selectedRequest.type)?.label}
                            </h3>
                            <span className={cn(
                              "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border",
                              getStatusColor(selectedRequest.status)
                            )}>
                              {selectedRequest.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDetailsDrawer(false)}
                          className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Employee Information */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Employee Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary text-sm font-medium">
                                {selectedRequest.employee.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{selectedRequest.employee.name}</div>
                              <div className="text-gray-500 text-sm">{selectedRequest.employee.email}</div>
                              {selectedRequest.employee.employeeId && (
                                <div className="text-gray-400 text-xs">ID: {selectedRequest.employee.employeeId}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Leave Details */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Leave Details</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white">{selectedRequest.days} day{selectedRequest.days !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Start Date:</span>
                            <span className="text-white">{new Date(selectedRequest.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">End Date:</span>
                            <span className="text-white">{new Date(selectedRequest.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Reason for Leave</h4>
                        <p className="text-gray-300 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
                          {selectedRequest.reason}
                        </p>
                      </div>

                      {/* Emergency Contact */}
                      {selectedRequest.emergencyContact && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-white">{selectedRequest.emergencyContact.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{selectedRequest.emergencyContact.phone}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{selectedRequest.emergencyContact.relationship}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Applied Date */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Application Details</h4>
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Applied on: {new Date(selectedRequest.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Approval Details */}
                      {(selectedRequest.status === 'approved' || selectedRequest.status === 'rejected') && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                            {selectedRequest.status === 'approved' ? 'Approval' : 'Rejection'} Details
                          </h4>
                          <div className="space-y-3">
                            {selectedRequest.approvedBy && (
                              <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-green-400" />
                                <span className="text-white">
                                  {selectedRequest.status === 'approved' ? 'Approved by' : 'Reviewed by'}: {selectedRequest.approvedBy.name}
                                </span>
                              </div>
                            )}
                            {selectedRequest.approvedAt && (
                              <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300">
                                  {selectedRequest.status === 'approved' ? 'Approved on' : 'Reviewed on'}: {new Date(selectedRequest.approvedAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {selectedRequest.rejectionReason && (
                              <div>
                                <p className="text-gray-400 mb-2">Rejection Reason:</p>
                                <p className="text-red-400 leading-relaxed bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                  {selectedRequest.rejectionReason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons for Pending */}
                      {selectedRequest.status === 'pending' && (
                        <div className="pt-4 border-t border-white/5 flex gap-3">
                          <button
                            onClick={() => handleApproveReject(selectedRequest._id, 'approved')}
                            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproveReject(selectedRequest._id, 'rejected')}
                            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No leave requests found</h3>
            <p className="text-gray-500 max-w-xs mx-auto">
              You haven't submitted any leave requests yet.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
