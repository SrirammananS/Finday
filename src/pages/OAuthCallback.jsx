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
    const [deepLinkFragment, setDeepLinkFragment] = useState(''); // for manual fallback (code flow has no hash)

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // CODE FLOW: ?code=xxx&state=yyy (Authorization Code - returns refresh_token)
                const searchParams = new URLSearchParams(window.location.search);
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const error = searchParams.get('error');

                // TOKEN FLOW: #access_token=xxx (Implicit - legacy, no refresh_token)
                const hash = window.location.hash.substring(1);
                const hashParams = new URLSearchParams(hash);
                const accessTokenFromHash = hashParams.get('access_token');
                const expiresInFromHash = hashParams.get('expires_in');

                if (error) {
                    console.error('[LAKSH OAuth] Callback error:', error);
                    localStorage.setItem('oauth_error', error);
                    setStatus('error');
                    setTimeout(() => navigate('/welcome', { replace: true }), 2000);
                    return;
                }

                let accessToken, expiresIn, refreshToken;

                if (code) {
                    // Authorization Code flow - exchange for tokens (includes refresh_token)
                    console.log('[LAKSH OAuth] Code received, exchanging for tokens...');
                    const { cloudBackup } = await import('../services/cloudBackup');
                    const redirectUri = window.location.origin + '/oauth-callback';
                    await cloudBackup.exchangeCodeForToken(code, redirectUri);
                    accessToken = cloudBackup.accessToken;
                    refreshToken = localStorage.getItem('google_refresh_token');
                    expiresIn = '3600';
                } else if (accessTokenFromHash) {
                    // Implicit flow (legacy)
                    accessToken = accessTokenFromHash;
                    expiresIn = expiresInFromHash || '3600';
                    refreshToken = null;
                } else {
                    console.error('[LAKSH OAuth] No code or access token in callback');
                    setStatus('error');
                    setTimeout(() => navigate('/welcome', { replace: true }), 2000);
                    return;
                }

                console.log('[LAKSH OAuth] Token received', refreshToken ? '(with refresh_token)' : '');

                // Store token for session restoration
                const isAndroid = /Android/i.test(navigator.userAgent) && /wv/i.test(navigator.userAgent);
                const expiryMs = isAndroid
                    ? Date.now() + (365 * 24 * 60 * 60 * 1000)
                    : Date.now() + (parseInt(expiresIn || '3600') * 1000);
                localStorage.setItem('google_access_token', accessToken);
                localStorage.setItem('google_token_expiry', String(expiryMs));
                if (refreshToken) localStorage.setItem('google_refresh_token', refreshToken);
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
                        refresh_token: refreshToken,
                        state: state
                    });
                    setTimeout(() => bc.close(), 1000);
                } catch {
                    console.warn('[LAKSH OAuth] BroadcastChannel not supported');
                }

                localStorage.setItem('oauth_success_trigger', Date.now().toString());
                localStorage.setItem('oauth_refresh_required', 'true');

                setStatus('success');

                const isInAppWebView = /wv/i.test(navigator.userAgent) && /Android/i.test(navigator.userAgent);
                const isAndroidExternalBrowser = /Android/i.test(navigator.userAgent) && !/wv/i.test(navigator.userAgent);

                if (isInAppWebView) {
                    setTimeout(() => { window.location.href = '/welcome'; }, 1500);
                } else if (isAndroidExternalBrowser) {
                    // Deep link with access_token AND refresh_token for token refresh
                    const fragment = new URLSearchParams({
                        access_token: accessToken,
                        expires_in: expiresIn,
                        ...(refreshToken && { refresh_token: refreshToken }),
                        ...(state && { state })
                    }).toString();
                    const deepLink = `laksh://oauth-callback#${fragment}`;

                    setDeepLinkFragment(fragment); // for manual fallback when deep link fails
                    console.log('[LAKSH OAuth] Attempting deep link redirect (with refresh_token)');
                    window.location.href = deepLink;

                    setTimeout(() => setStatus('manual'), 2000);
                } else {
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
        } catch {
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
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="text-green-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mb-2">Sign-in Successful!</h2>
                    <p className="text-text-muted max-w-xs mb-8 text-center">
                        Tap the button below to return to LAKSH
                    </p>

                    <div className="w-full max-w-md space-y-4 px-4">
                        {/* Primary action - Open App via deep link (works for both code & token flow) */}
                        <a
                            id="deeplink-btn"
                            href={deepLinkFragment ? `intent://oauth-callback#${deepLinkFragment}#Intent;scheme=laksh;package=com.laksh.finance;end` : `laksh://oauth-callback${window.location.hash}`}
                            className="block w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-xl text-center shadow-lg shadow-primary/30"
                        >
                            📱 Open LAKSH App
                        </a>

                        {/* Alternative - direct deep link */}
                        <a
                            href={deepLinkFragment ? `laksh://oauth-callback#${deepLinkFragment}` : `laksh://oauth-callback${window.location.hash}`}
                            className="block w-full py-4 bg-canvas-subtle border border-card-border text-text-main rounded-xl font-medium text-center"
                        >
                            Alternative: Try Direct Link
                        </a>

                        {/* Fallback - Copy URL */}
                        <div className="p-4 bg-card rounded-xl border border-card-border">
                            <p className="text-xs text-text-muted mb-3 text-center">If buttons don't work, copy and paste in app:</p>
                            <button
                                onClick={handleCopyUrl}
                                className="w-full py-3 bg-canvas-subtle text-text-main rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                <Copy size={16} />
                                {copied ? 'Copied! Now go back to app' : 'Copy Token URL'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
