import React from 'react';

/**
 * Error Boundary Component
 * Catches React errors and displays a friendly fallback UI with debug info
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error('[LAKSH Error Boundary]', error, errorInfo);

        // Auto-reload if it's a module load error (e.g. after a new deployment)
        const isModuleError =
            error?.name === 'ChunkLoadError' ||
            error?.message?.includes('Importing a module script failed') ||
            error?.message?.includes('Failed to fetch dynamically imported module');

        if (isModuleError) {
            const pageHasAlreadyBeenForceRefreshed = JSON.parse(
                window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
            );

            if (!pageHasAlreadyBeenForceRefreshed) {
                window.localStorage.setItem('page-has-been-force-refreshed', 'true');
                this.handleReload();
            }
        }
    }

    handleReload = () => {
        // Clear caches and reload
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        localStorage.removeItem('finday_gapi_token');
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    backgroundColor: '#0a0a0a',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                        {/* Emoji */}
                        <div style={{ fontSize: '60px', marginBottom: '24px' }}>😅</div>

                        {/* Title */}
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                            Oops! Something went wrong
                        </h1>

                        {/* Subtitle */}
                        <p style={{ color: '#888', marginBottom: '24px', fontSize: '14px' }}>
                            Don't worry, your data is safe.
                        </p>

                        {/* Error details - ALWAYS SHOW for debugging */}
                        {this.state.error && (
                            <div style={{
                                textAlign: 'left',
                                padding: '16px',
                                borderRadius: '12px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                marginBottom: '24px',
                                maxHeight: '200px',
                                overflow: 'auto'
                            }}>
                                <p style={{
                                    color: '#ff6b6b',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    wordBreak: 'break-word'
                                }}>
                                    {this.state.error.toString()}
                                </p>
                                <pre style={{
                                    color: '#666',
                                    fontSize: '10px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    margin: 0
                                }}>
                                    {this.state.errorInfo?.componentStack?.slice(0, 400)}
                                </pre>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    backgroundColor: '#6366f1',
                                    color: '#fff',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear & Refresh
                            </button>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: '#888',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    border: '1px solid #333',
                                    cursor: 'pointer'
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
