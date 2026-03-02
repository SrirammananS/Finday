/**
 * Detect where the transaction was created: pwa, mobile, or web.
 */
export function detectTransactionSource() {
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isAndroidWebView =
    /Android/i.test(navigator.userAgent) && /wv/i.test(navigator.userAgent);
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isPWA) return 'pwa';
  if (isAndroidWebView || isMobile) return 'mobile';
  return 'web';
}
