'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MessageSquare, Save, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback?: string) => Promise<void>;
    initialFeedback?: string;
    reportId: string;
    mode?: 'review' | 'approve';
    title?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialFeedback = '',
    reportId,
    mode = 'review',
    title = mode === 'approve' ? 'Approve Report' : 'Review Feedback',
}) => {
    const [feedback, setFeedback] = useState(initialFeedback);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFeedback(initialFeedback);
            setError('');
        }
    }, [isOpen, initialFeedback]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // For review mode, feedback is required
        if (mode === 'review' && !feedback.trim()) {
            setError('Please enter some feedback');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // Pass feedback for review mode, undefined for approve mode (if no feedback)
            await onSubmit(mode === 'review' ? feedback : (feedback.trim() || undefined));
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save feedback');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            className="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        {mode === 'approve' ? 'Optional feedback for this approval' : 'Enter feedback for this report'}
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={mode === 'approve' ? 'Add optional feedback (optional)...' : 'Write your feedback here...'}
                        className="w-full h-40 px-4 py-3 bg-white/8 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none placeholder:text-gray-500"
                        disabled={loading}
                    />
                    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                    {mode === 'approve' && (
                        <p className="text-xs text-gray-500">
                            Leave feedback empty to approve without review, or add feedback to mark as reviewed
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] px-4 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {loading ? 'Saving...' : (mode === 'approve' ? 'Approve Report' : 'Save Feedback')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
