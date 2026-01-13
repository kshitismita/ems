'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorId?: string;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error?: Error; errorId?: string; onReset: () => void }>;
}

class TodoErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Generate a unique error ID for tracking
        const errorId = `todo-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
            hasError: true,
            error,
            errorId
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[TODO_ERROR_BOUNDARY] Caught error:', {
            error,
            errorInfo,
            errorId: this.state.errorId,
            timestamp: new Date().toISOString()
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorId: undefined });
    };

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback;
            return (
                <FallbackComponent
                    error={this.state.error}
                    errorId={this.state.errorId}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

const DefaultErrorFallback: React.FC<{
    error?: Error;
    errorId?: string;
    onReset: () => void;
}> = ({ error, errorId, onReset }) => {
    const handleReportError = () => {
        const errorDetails = {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            errorId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('[TODO_ERROR_REPORT]', errorDetails);
        
        // Copy error details to clipboard for user to report
        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                alert('Error details copied to clipboard. Please report this to support.');
            })
            .catch(() => {
                alert('Failed to copy error details. Please take a screenshot and report this issue.');
            });
    };

    return (
        <Card className="p-6 h-full flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2">
                    Something went wrong
                </h3>
                
                <p className="text-gray-400 text-sm mb-4 max-w-md">
                    The todo list encountered an unexpected error. We apologize for the inconvenience.
                </p>
                
                {errorId && (
                    <p className="text-xs text-gray-500 mb-4">
                        Error ID: {errorId}
                    </p>
                )}
                
                <div className="flex gap-2 flex-wrap justify-center">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                    
                    <button
                        onClick={handleReportError}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                    >
                        Report Issue
                    </button>
                </div>
                
                {process.env.NODE_ENV === 'development' && error && (
                    <details className="mt-4 text-left">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                            Error Details (Development)
                        </summary>
                        <pre className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded overflow-auto max-h-32">
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </Card>
    );
};

export default TodoErrorBoundary;
