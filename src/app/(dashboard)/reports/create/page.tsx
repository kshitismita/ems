'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import {
  ArrowLeft, Save, X, Plus, Calendar,
  CheckCircle2, Clock, AlertTriangle, Trophy,
  FileText, Trash2, Send, Upload, File
} from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';

export default function CreateReportPage() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    tasksCompleted: '',
    tasksInProgress: '',
    challenges: [''],
    notes: '',
    project: '',
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<Array<{
    url: string;
    public_id: string;
    name: string;
    size: number;
    resource_type: string;
    format: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = getLocalStorage('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchProjects(token);
  }, [router]);

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const submitData = {
      ...formData,
      challenges: formData.challenges.filter(challenge => challenge.trim() !== ''),
      attachments: attachments,
    };

    const token = getLocalStorage('token');
    try {
      const response = await fetch('/api/daily-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push('/reports');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit report');
      }
    } catch (error) {
      setError('An error occurred while submitting the report');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/reference-library/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getLocalStorage('token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = response.status === 401
            ? { error: 'Authentication required' }
            : await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        return {
          url: data.url,
          public_id: data.public_id,
          name: file.name,
          size: file.size,
          resource_type: data.fileType,
          format: data.fileType,
        };
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    });

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...uploadedFiles]);
    } catch (error) {
      setError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const addField = (field: 'challenges') => {
    setFormData({
      ...formData,
      [field]: [...formData[field], ''],
    });
  };

  const removeField = (field: 'challenges', index: number) => {
    if (formData[field].length > 1) {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index),
      });
    } else {
      // If it's the last field, just clear it instead of removing
      const updated = [...formData[field]];
      updated[0] = '';
      setFormData({
        ...formData,
        [field]: updated
      });
    }
  };

  const updateField = (field: 'challenges', index: number, value: string) => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData({
      ...formData,
      [field]: updated,
    });
  };

  const renderDynamicFields = (
    label: string,
    field: 'challenges',
    icon: React.ReactNode,
    placeholder: string
  ) => (
    <Card className="p-6 border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {label}
        </h3>
        <button
          type="button"
          onClick={() => addField(field)}
          className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {formData[field].map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => updateField(field, index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button
              type="button"
              onClick={() => removeField(field, index)}
              className="p-2.5 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl border border-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/reports')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Daily Status Report</h1>
            <p className="text-gray-500 text-sm">Document your achievements, progress, and upcoming goals</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Project and Date Selection */}
            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Report Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                  <span className="text-xs text-gray-500 uppercase font-semibold whitespace-nowrap">Project:</span>
                  <select
                    name="project"
                    value={formData.project}
                    onChange={handleChange}
                    required
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer flex-1"
                  >
                    <option value="" className="bg-gray-900">Select Project</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id} className="bg-gray-900">{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer [color-scheme:dark] flex-1"
                  />
                </div>
              </div>
            </Card>

            {/* Completed Tasks */}
            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Completed Tasks
              </h3>
              <textarea
                name="tasksCompleted"
                rows={4}
                maxLength={500}
                value={formData.tasksCompleted}
                onChange={handleChange}
                placeholder="What did you finish today? (500 words maximum)"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
              {formData.tasksCompleted && formData.tasksCompleted.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tasksCompleted.length}/500 characters
                </p>
              )}
            </Card>

            {/* Tasks in Progress */}
            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Tasks in Progress
              </h3>
              <textarea
                name="tasksInProgress"
                rows={4}
                value={formData.tasksInProgress}
                onChange={handleChange}
                placeholder="What are you currently working on?"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
            </Card>

            {/* Challenges */}
            {renderDynamicFields(
              "Challenges",
              "challenges",
              <AlertTriangle className="w-4 h-4 text-yellow-400" />,
              "Any blockers or issues?"
            )}

            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Additional Notes
              </h3>
              <textarea
                name="notes"
                rows={5}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional information, upcoming time off, or context..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
            </Card>

            {/* File Upload Section */}
            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-400" />
                Attachments
              </h3>

              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white cursor-pointer transition-all">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {uploading ? 'Uploading...' : 'Choose Files'}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-500">
                    Images, PDFs, Documents (Max 10MB each)
                  </span>
                </div>

                {/* Uploaded Files */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Uploaded Files:</p>
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.resource_type}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={() => router.push('/reports')}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Final Report'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
