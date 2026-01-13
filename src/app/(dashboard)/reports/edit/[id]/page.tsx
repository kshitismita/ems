'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  FileText, Save, ArrowLeft, Plus, X, Upload, Loader2
} from 'lucide-react';

interface DailyReport {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
  };
  date: string;
  tasksCompleted: string[];
  tasksInProgress: string[];
  challenges: string[];
  achievements: string[];
  notes?: string;
  project: {
    _id: string;
    name: string;
  };
  status: string;
  submittedAt: string;
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
}

export default function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<{ _id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    project: '',
    tasksCompleted: [''],
    tasksInProgress: [''],
    challenges: [''],
    achievements: [''],
    notes: '',
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

    fetchReport(token, id);
    fetchProjects(token);
  }, [router, id]);

  const fetchReport = async (token: string, reportId: string) => {
    try {
      const response = await fetch(`/api/daily-reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data.report);

        // Populate form with existing data
        setFormData({
          project: data.report.project?._id || '',
          tasksCompleted: data.report.tasksCompleted.length > 0 ? data.report.tasksCompleted : [''],
          tasksInProgress: data.report.tasksInProgress.length > 0 ? data.report.tasksInProgress : [''],
          challenges: data.report.challenges.length > 0 ? data.report.challenges : [''],
          achievements: data.report.achievements.length > 0 ? data.report.achievements : [''],
          notes: data.report.notes || '',
        });
      } else {
        setError('Failed to fetch report');
      }
    } catch (error) {
      setError('An error occurred while fetching the report');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleArrayFieldChange = (field: 'tasksCompleted' | 'tasksInProgress' | 'challenges' | 'achievements', index: number, value: string) => {
    const newField = [...formData[field]];
    newField[index] = value;
    setFormData({ ...formData, [field]: newField });
  };

  const addArrayField = (field: 'tasksCompleted' | 'tasksInProgress' | 'challenges' | 'achievements') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayField = (field: 'tasksCompleted' | 'tasksInProgress' | 'challenges' | 'achievements', index: number) => {
    if (formData[field].length > 1) {
      const newField = formData[field].filter((_, i) => i !== index);
      setFormData({ ...formData, [field]: newField });
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
        tasksCompleted: formData.tasksCompleted.filter(task => task.trim() !== ''),
        tasksInProgress: formData.tasksInProgress.filter(task => task.trim() !== ''),
        challenges: formData.challenges.filter(challenge => challenge.trim() !== ''),
        achievements: formData.achievements.filter(achievement => achievement.trim() !== ''),
      };

      const response = await fetch(`/api/daily-reports/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push('/reports?resubmitted=true');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update report');
      }
    } catch (error) {
      setError('An error occurred while updating the report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Report not found</h3>
          <p className="text-gray-500">The report you're trying to edit doesn't exist.</p>
        </Card>
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Edit Report</h1>
            <p className="text-gray-400 mt-1">
              Resubmitting report for {new Date(report.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Feedback Display */}
        {report.feedback && (
          <Card className="p-6 border-red-500/20 bg-red-500/5">
            <h3 className="text-lg font-bold text-red-400 mb-3">Previous Feedback</h3>
            <p className="text-red-300">{report.feedback}</p>
          </Card>
        )}

        {/* Edit Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Project</label>
              <select
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-primary focus:outline-none transition-colors"
                required
              >
                <option value="" className="bg-gray-900">Select a project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id} className="bg-gray-900">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tasks Completed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tasks Completed</label>
                <button
                  type="button"
                  onClick={() => addArrayField('tasksCompleted')}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tasksCompleted.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => handleArrayFieldChange('tasksCompleted', index, e.target.value)}
                    placeholder="Describe a completed task..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  {formData.tasksCompleted.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayField('tasksCompleted', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Tasks In Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tasks In Progress</label>
                <button
                  type="button"
                  onClick={() => addArrayField('tasksInProgress')}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.tasksInProgress.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => handleArrayFieldChange('tasksInProgress', index, e.target.value)}
                    placeholder="Describe a task in progress..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  {formData.tasksInProgress.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayField('tasksInProgress', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Challenges */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Challenges</label>
                <button
                  type="button"
                  onClick={() => addArrayField('challenges')}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.challenges.map((challenge, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={challenge}
                    onChange={(e) => handleArrayFieldChange('challenges', index, e.target.value)}
                    placeholder="Describe a challenge faced..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  {formData.challenges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayField('challenges', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Achievements</label>
                <button
                  type="button"
                  onClick={() => addArrayField('achievements')}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {formData.achievements.map((achievement, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => handleArrayFieldChange('achievements', index, e.target.value)}
                    placeholder="Describe an achievement..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  {formData.achievements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayField('achievements', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes or comments..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Error Display */}
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
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Resubmit Report
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
