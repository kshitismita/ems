'use client';

import React, { useState, useEffect } from 'react';
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
  X,
  Save,
  ArrowLeft,
  ChevronDown,
  Check
} from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';

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
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate: string;
  };
}

export default function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agenda: [''],
    dateTime: '', // Combined date and time
    duration: 60, // Duration in minutes (default 1 hour)
    meetingLink: '',
    location: '',
    attendees: [] as string[], // Array of attendee IDs
    isRecurring: false,
    recurrence: {
      frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
      interval: 1,
      endDate: ''
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'admin') {
      router.push('/meetings');
      return;
    }

    fetchMeetingData(token);
    fetchEmployees(token);
  }, [router]);

  const fetchMeetingData = async (token: string) => {
    try {
      const { id } = await params;
      const response = await fetch(`/api/meetings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const meetingData = data.meeting;
        setMeeting(meetingData);

        // Convert attendees array to string array for the form
        const attendeeIds = meetingData.attendees.map((attendee: any) => attendee._id);

        // Calculate duration in minutes
        const startTime = new Date(meetingData.startTime);
        const endTime = new Date(meetingData.endTime);
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        setFormData({
          title: meetingData.title || '',
          description: meetingData.description || '',
          agenda: meetingData.agenda && meetingData.agenda.length > 0 ? meetingData.agenda : [''],
          dateTime: startTime.toISOString().slice(0, 16), // Format for datetime-local input
          duration: duration,
          meetingLink: meetingData.meetingLink || '',
          location: meetingData.location || '',
          attendees: attendeeIds,
          isRecurring: meetingData.isRecurring || false,
          recurrence: meetingData.recurrence || {
            frequency: 'weekly' as const,
            interval: 1,
            endDate: ''
          }
        });
      } else {
        setError('Failed to load meeting data');
      }
    } catch (error) {
      setError('An error occurred while loading meeting data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (token: string) => {
    try {
      const response = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAgendaChange = (index: number, value: string) => {
    const newAgenda = [...formData.agenda];
    newAgenda[index] = value;
    setFormData({ ...formData, agenda: newAgenda });
  };

  const addAgendaItem = () => {
    setFormData({ ...formData, agenda: [...formData.agenda, ''] });
  };

  const removeAgendaItem = (index: number) => {
    if (formData.agenda.length > 1) {
      const newAgenda = formData.agenda.filter((_, i) => i !== index);
      setFormData({ ...formData, agenda: newAgenda });
    }
  };

  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  const handleAttendeeToggle = (employeeId: string) => {
    if (formData.attendees.includes(employeeId)) {
      setFormData({
        ...formData,
        attendees: formData.attendees.filter(id => id !== employeeId)
      });
    } else {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, employeeId]
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const token = localStorage.getItem('token');

    try {
      const { id } = await params;

      const submitData = {
        ...formData,
        agenda: formData.agenda.filter(item => item.trim() !== ''),
        startTime: new Date(formData.dateTime).toISOString(),
      };

      console.log('[MEETING_EDIT] Submitting data:', submitData);

      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push('/meetings?updated=true');
      } else {
        const errorData = await response.json();
        console.error('[MEETING_EDIT] API Error:', errorData);
        setError(errorData.error || 'Failed to update meeting');
      }
    } catch (error) {
      console.error('[MEETING_EDIT] Submit Error:', error);
      setError('An error occurred while updating meeting');
    } finally {
      setSaving(false);
    }
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

  if (error && !meeting) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Error</h3>
            <p className="text-gray-400">{error}</p>
            <button
              onClick={() => router.push('/meetings')}
              className="mt-4 px-4 py-2 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all"
            >
              Back to Meetings
            </button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Edit Meeting</h1>
            <p className="text-gray-400 mt-1">Update meeting details and attendees</p>
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Meeting Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter meeting title"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Meeting Link</label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    placeholder="https://zoom.us/meeting/..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Conference Room A"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter meeting description"
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            {/* Agenda */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Agenda</h3>
                <button
                  type="button"
                  onClick={addAgendaItem}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {formData.agenda.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="flex items-center justify-center w-8 h-12 bg-primary/20 text-primary rounded-lg border border-primary/30 text-sm font-bold">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleAgendaChange(index, e.target.value)}
                      placeholder={"Agenda item " + (index + 1)}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    {formData.agenda.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAgendaItem(index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Attendees */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white">Attendees</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Select Attendees</label>
                <div className="relative">
                  <div className="relative">
                    <Users className="absolute left-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      value={attendeeSearch}
                      onChange={(e) => setAttendeeSearch(e.target.value)}
                      onFocus={() => setShowAttendeeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowAttendeeDropdown(false), 200)}
                      placeholder="Search employees by name or email..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="absolute right-3 top-3 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  {showAttendeeDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((employee) => {
                          const isSelected = formData.attendees.includes(employee._id);
                          return (
                            <div
                              key={employee._id}
                              onClick={() => handleAttendeeToggle(employee._id)}
                              className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors ${isSelected ? 'bg-primary/20 border-l-2 border-primary' : ''
                                }`}
                            >
                              <div>
                                <div className="font-medium text-white">{employee.name}</div>
                                <div className="text-sm text-gray-400">{employee.email}</div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-3 text-gray-400 text-center">
                          No employees found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formData.attendees.length} attendee{formData.attendees.length !== 1 ? 's' : ''} selected
                </p>

                {/* Selected Attendees List */}
                {formData.attendees.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium text-gray-300">Selected Attendees</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.attendees.map((attendeeId) => {
                        const employee = employees.find(emp => emp._id === attendeeId);
                        if (!employee) return null;
                        return (
                          <div
                            key={attendeeId}
                            className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-white text-sm">{employee.name}</div>
                              <div className="text-xs text-gray-400">{employee.email}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAttendeeToggle(attendeeId)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                              title="Remove attendee"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </>
                )}
                {!saving && (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Meeting</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
