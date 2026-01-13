'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Plus, 
  Filter,
  Search,
  ChevronRight,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  agenda?: string[];
  meetingLink?: string;
  startTime: string;
  endTime: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  attendees: User[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  location?: string;
  isRecurring: boolean;
}

export default function MeetingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    const token = getLocalStorage('token');
    const userData = getLocalStorage('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchMeetings(token);
  }, [router]);

  const fetchMeetings = async (token: string) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/meetings?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'ongoing': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ongoing': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMeetingUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    console.log('[MEETINGS_PAGE] Starting meeting deletion for ID:', meetingId);
    
    if (!confirm('Are you sure you want to cancel this meeting? This action cannot be undone.')) {
      console.log('[MEETINGS_PAGE] User cancelled deletion');
      return;
    }

    setDeleteLoading(meetingId);
    const token = getLocalStorage('token');

    try {
      console.log('[MEETINGS_PAGE] Sending DELETE request to API');
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('[MEETINGS_PAGE] DELETE response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('[MEETINGS_PAGE] DELETE response data:', responseData);
        
        // Remove the meeting from the list
        console.log('[MEETINGS_PAGE] Removing meeting from local state');
        setMeetings(meetings.filter(meeting => meeting?._id !== meetingId));
        console.log('[MEETINGS_PAGE] Meeting deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('[MEETINGS_PAGE] DELETE error response:', errorData);
        alert(errorData.error || 'Failed to cancel meeting');
      }
    } catch (error) {
      console.error('[MEETINGS_PAGE] DELETE request error:', error);
      alert('An error occurred while cancelling the meeting');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditMeeting = (meetingId: string) => {
    router.push(`/meetings/edit/${meetingId}`);
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
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Meetings</h1>
            <p className="text-gray-400 mt-1">
              {user?.role === 'admin' ? 'Manage and schedule meetings' : 'View your upcoming meetings'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => router.push('/meetings/create')}
              className="px-4 py-2 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Schedule Meeting
            </button>
          )}
        </div>

        {/* Filters */}
        <Card className="p-6 border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Search Meetings</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title, description, or organizer..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    const token = getLocalStorage('token');
                    if (token) fetchMeetings(token);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-white/10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status Filter</label>
              <div className="relative">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    const token = getLocalStorage('token');
                    if (token) fetchMeetings(token);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer transition-all hover:bg-white/10"
                >
                  <option value="" className="bg-slate-900">All Active Meetings</option>
                  <option value="scheduled" className="bg-slate-900">📅 Scheduled</option>
                  <option value="ongoing" className="bg-slate-900">⏳ Ongoing</option>
                  <option value="completed" className="bg-slate-900">✅ Completed</option>
                  <option value="cancelled" className="bg-slate-900">❌ Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Meetings List */}
        <div className="space-y-4">
          {meetings.length > 0 ? (
            meetings.map((meeting) => (
              <Card 
                key={meeting?._id} 
                className={cn(
                  "group border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden",
                  isMeetingUpcoming(meeting?.startTime) && "ring-2 ring-primary/20"
                )}
              >
                <div className="p-6">
                  {/* Meeting Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(meeting?.status)}
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {meeting?.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDateTime(meeting?.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(meeting?.endTime).getHours() - new Date(meeting?.startTime).getHours()}h {Math.abs(new Date(meeting?.endTime).getMinutes() - new Date(meeting?.startTime).getMinutes())}m
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusColor(meeting?.status))}>
                        {meeting?.status.toUpperCase()}
                      </div>
                      {isMeetingUpcoming(meeting?.startTime) && (
                        <div className="text-xs text-primary font-medium">UPCOMING</div>
                      )}
                      {user?.role === 'admin' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMeeting(meeting?._id)}
                            disabled={meeting?.status === 'cancelled'}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={meeting?.status === 'cancelled' ? 'Cannot edit cancelled meeting' : 'Edit meeting'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {meeting?.status !== 'cancelled' ? (
                            <button
                              onClick={() => handleDeleteMeeting(meeting?._id)}
                              disabled={deleteLoading === meeting?._id}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Cancel meeting"
                            >
                              {deleteLoading === meeting?._id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <div className="p-2 text-gray-500 cursor-not-allowed" title="Meeting already cancelled">
                              <Trash2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                {/* Meeting Details */}
                {meeting?.description && (
                  <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    {meeting?.description}
                  </p>
                )}

                {/* Agenda */}
                {meeting?.agenda && meeting?.agenda.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Agenda</h4>
                    <ul className="space-y-2">
                      {meeting?.agenda.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Meeting Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {meeting?.meetingLink && (
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <Video className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Meeting Link</p>
                        <a 
                          href={meeting?.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary/80 truncate block"
                        >
                          {meeting?.meetingLink}
                        </a>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(meeting?.meetingLink!)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <LinkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {meeting?.location && (
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <MapPin className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm text-white">{meeting?.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attendees */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {(meeting?.attendees?.length ?? 0)} attendee{(meeting?.attendees?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Organized by</span>
                    <span className="text-sm text-white">{meeting?.organizer?.name || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center border-white/5 bg-white/[0.02] border-dashed">
            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No meetings found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {user?.role === 'admin' 
                ? 'No meetings scheduled. Create your first meeting to get started.'
                : 'No meetings scheduled for you. Check back later.'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  </DashboardLayout>
);

}
