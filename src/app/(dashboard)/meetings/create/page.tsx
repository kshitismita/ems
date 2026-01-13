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
  X,
  Save,
  ArrowLeft
} from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

export default function CreateMeetingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
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
    attendees: [] as string[], // Array of attendee IDs
    isRecurring: false,
    recurrence: {
      frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
      interval: 1,
      endDate: ''
    }
  });

  const [searchTerm, setSearchTerm] = useState('');

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

    fetchEmployees(token);
  }, [router]);

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
    } finally {
      setLoading(false);
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

  const handleAttendeeChange = (employeeId: string, isChecked: boolean) => {
    if (isChecked) {
      setFormData({ 
        ...formData, 
        attendees: [...formData.attendees, employeeId] 
      });
    } else {
      setFormData({ 
        ...formData, 
        attendees: formData.attendees.filter(id => id !== employeeId) 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const token = localStorage.getItem('token');

    try {
      const submitData = {
        ...formData,
        agenda: formData.agenda.filter(item => item.trim() !== ''),
        startTime: new Date(formData.dateTime).toISOString(),
        endTime: new Date(new Date(formData.dateTime).getTime() + formData.duration * 60000).toISOString(), // Add duration to start time
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push('/meetings?created=true');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create meeting');
      }
    } catch (error) {
      setError('An error occurred while creating the meeting');
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Schedule Meeting</h1>
            <p className="text-gray-400 mt-1">Create a new meeting and invite attendees</p>
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
                  <label className="text-sm font-medium text-gray-300">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    placeholder="60"
                    min="15"
                    max="480"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

              {/* Attendees */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Attendees</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Search & Select Attendees</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search employees by name or email..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {/* Filtered Employees List */}
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-white/5">
                    {employees
                      .filter(employee => 
                        searchTerm === '' || 
                        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        employee.email.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((employee) => (
                        <label key={employee._id} className="flex items-center gap-3 p-3 hover:bg-white/10 transition-colors cursor-pointer border-b border-white/5 last:border-b-0">
                          <input
                            type="checkbox"
                            checked={formData.attendees.includes(employee._id)}
                            onChange={(e) => handleAttendeeChange(employee._id, e.target.checked)}
                            className="w-4 h-4 text-primary bg-white/5 border-white/20 rounded focus:ring-2 focus:ring-primary/50"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{employee.name}</p>
                            <p className="text-xs text-gray-400">{employee.email}</p>
                          </div>
                        </label>
                      ))}
                    {employees.filter(employee => 
                      searchTerm === '' || 
                      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-gray-400">
                        No employees found matching "{searchTerm}"
                      </div>
                    )}
                  </div>

                  {/* Selected Attendees Display */}
                  {formData.attendees.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Selected Attendees ({formData.attendees.length})</label>
                      <div className="flex flex-wrap gap-2">
                        {formData.attendees.map((attendeeId) => {
                          const employee = employees.find(emp => emp._id === attendeeId);
                          return employee ? (
                            <div key={attendeeId} className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-lg border border-primary/30">
                              <span className="text-sm font-medium">{employee.name}</span>
                              <button
                                type="button"
                                onClick={() => handleAttendeeChange(attendeeId, false)}
                                className="text-primary hover:text-primary/80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Scheduling...</span>
                  </>
                )}
                {!saving && (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Schedule Meeting</span>
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
