/**
 * Tracks any modal/overlay in the DOM and hides the Dynamic Island when one is open.
 * Add data-modal-overlay to fixed overlay elements; when any exist, body gets modal-open class.
 */
import { useEffect } from 'react';

const OVERLAY_SELECTOR = '[data-modal-overlay]';

export default function ModalOverlayTracker() {
    useEffect(() => {
        const updateModalOpen = () => {
            const hasOverlay = document.querySelector(OVERLAY_SELECTOR);
            document.body.classList.toggle('modal-open', !!hasOverlay);
        };

        const observer = new MutationObserver(updateModalOpen);
        observer.observe(document.body, { childList: true, subtree: true });
        updateModalOpen();

        return () => {
            observer.disconnect();
            document.body.classList.remove('modal-open');
        };
    }, []);

    return null;
}
