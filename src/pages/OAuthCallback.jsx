import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Copy, AlertCircle } from 'lucide-react';

/**
 * Handle OAuth callback for mobile/PWA environments
 * Extracts token from URL fragment and notifies the app
 */
export default function OAuthCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, error, manual
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Parse params from hash fragment (standard OAuth2 response)
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                const accessToken = params.get('access_token');
                const expiresIn = params.get('expires_in');
                const state = params.get('state');
                const error = params.get('error');

                if (error) {
                    console.error('[LAKSH OAuth] Callback error:', error);
                    localStorage.setItem('oauth_error', error);
                    setStatus('error');
                    setTimeout(() => navigate('/welcome', { replace: true }), 2000);
                    return;
                }

                if (!accessToken) {
                    console.error('[LAKSH OAuth] No access token in callback');
                    setStatus('error');
                    setTimeout(() => navigate('/welcome', { replace: true }), 2000);
                    return;
                }

                console.log('[LAKSH OAuth] Token received');

                // Store token for session restoration
                const expiryMs = Date.now() + (parseInt(expiresIn || '3600') * 1000);
                localStorage.setItem('google_access_token', accessToken);
                localStorage.setItem('google_token_expiry', String(expiryMs));
                localStorage.setItem('oauth_pending', 'false');
                sessionStorage.setItem('google_access_token', accessToken);
                sessionStorage.setItem('google_token_expiry', String(expiryMs));

                // Notify main app window via BroadcastChannel
                try {
                    const bc = new BroadcastChannel('laksh-oauth');
                    bc.postMessage({
                        type: 'oauth_token',
                        access_token: accessToken,
                        expires_in: expiresIn,
                        state: state
                    });
                    setTimeout(() => bc.close(), 1000);
                } catch (e) {
                    console.warn('[LAKSH OAuth] BroadcastChannel not supported');
                }

                // Fallback for storage event listeners
                localStorage.setItem('oauth_success_trigger', Date.now().toString());

                setStatus('success');

                // Check if we're running INSIDE the WebView (same origin) vs external browser
                const isInAppWebView = /wv/i.test(navigator.userAgent) && /Android/i.test(navigator.userAgent);
                const isAndroidExternalBrowser = /Android/i.test(navigator.userAgent) && !/wv/i.test(navigator.userAgent);

                if (isInAppWebView) {
                    // We're IN the WebView, token is saved, redirect directly
                    setTimeout(() => navigate('/welcome', { replace: true }), 1500);
                } else if (isAndroidExternalBrowser) {
                    // We're in Chrome/external browser
                    // Try to redirect to the app using deep link
                    const deepLink = `laksh://oauth-callback#access_token=${accessToken}&expires_in=${expiresIn}&state=${state}`;

                    // First try deep link redirect
                    console.log('[LAKSH OAuth] Attempting deep link redirect');
                    window.location.href = deepLink;

                    // If deep link doesn't work after 2 seconds, show manual instructions
                    setTimeout(() => {
                        setStatus('manual');
                    }, 2000);
                } else {
                    // Desktop/PWA - standard flow
                    setTimeout(() => navigate('/welcome', { replace: true }), 1500);
                }

            } catch (err) {
                console.error('[LAKSH OAuth] Callback processing failed:', err);
                setStatus('error');
                setTimeout(() => navigate('/welcome', { replace: true }), 2000);
            }
        };

        handleCallback();
    }, [navigate]);

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
            {status === 'processing' && (
                <>
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Loader2 className="text-primary animate-spin" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-text-main mb-2">Completing Sign-in...</h2>
                    <p className="text-text-muted max-w-xs">Setting up your secure connection with Google.</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="text-green-500 animate-bounce" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-text-main mb-2">Sign-in Successful!</h2>
                    <p className="text-text-muted max-w-xs">Returning you to LAKSH. Please wait a moment.</p>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-text-main mb-2">Sign-in Failed</h2>
                    <p className="text-text-muted max-w-xs">Something went wrong. Returning to welcome screen...</p>
                </>
            )}

            {status === 'manual' && (
                <>
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="text-green-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-text-main mb-2">Sign-in Successful!</h2>
                    <p className="text-text-muted max-w-xs mb-6">
                        Tap the button below to return to LAKSH app
                    </p>

                    <div className="w-full max-w-md space-y-4">
                        {/* Primary action - Open App via deep link */}
                        <button
                            onClick={() => {
                                const hash = window.location.hash.substring(1);
                                const deepLink = `laksh://oauth-callback#${hash}`;
                                window.location.href = deepLink;
                            }}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg"
                        >
                            📱 Open LAKSH App
                        </button>

                        {/* Fallback - Copy URL */}
                        <div className="p-4 bg-card rounded-xl border border-card-border">
                            <p className="text-xs text-text-muted mb-2">If the button doesn't work:</p>
                            <button
                                onClick={handleCopyUrl}
                                className="w-full py-3 bg-canvas-subtle text-text-main rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                <Copy size={16} />
                                {copied ? 'Copied!' : 'Copy URL & Go Back Manually'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
