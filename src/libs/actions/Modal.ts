import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

const closeModals: Array<(isNavigating: boolean) => void> = [];

let onModalClose: null | (() => void);

/**
 * Remove onClose function in list
 */
function removeCloseModal(onClose: () => void) {
    const index = closeModals.findIndex((o) => o === onClose);
    if (index === -1) {
        return;
    }
    closeModals.splice(index, 1);
}

/**
 * Allows other parts of the app to call modal close function
 */
function setCloseModal(onClose: () => void) {
    closeModals.push(onClose);
    return () => removeCloseModal(onClose);
}

/**
 * Close modal in other parts of the app
 */
function close(onModalCloseCallback: () => void, isNavigating = true) {
    onModalClose = onModalCloseCallback;
    const reverseCloseModals = [...closeModals].reverse();
    reverseCloseModals.forEach((onClose) => {
        onClose(isNavigating);
    });
}

function onModalDidClose() {
    if (!onModalClose) {
        return;
    }
    onModalClose();
    onModalClose = null;
}

/**
 * Allows other parts of the app to know when a modal has been opened or closed
 */
function setModalVisibility(isVisible: boolean) {
    Onyx.merge(ONYXKEYS.MODAL, {isVisible});
}

/**
 * Allows other parts of app to know that an alert modal is about to open.
 * This will trigger as soon as a modal is opened but not yet visible while animation is running.
 */
function willAlertModalBecomeVisible(isVisible: boolean) {
    Onyx.merge(ONYXKEYS.MODAL, {willAlertModalBecomeVisible: isVisible});
}

export {setCloseModal, close, onModalDidClose, setModalVisibility, willAlertModalBecomeVisible};
