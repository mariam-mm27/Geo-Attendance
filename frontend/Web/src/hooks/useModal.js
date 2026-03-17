import { useState } from 'react';

export const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    onConfirm: null
  });

  const showModal = ({ title, message, type = 'info', confirmText = 'OK', onConfirm }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

 
  const showSuccess = (message, title = 'Success', onConfirm = null) => {
    showModal({ title, message, type: 'success', onConfirm });
  };

  const showError = (message, title = 'Error', onConfirm = null) => {
    showModal({ title, message, type: 'error', onConfirm });
  };

  const showWarning = (message, title = 'Warning', onConfirm = null) => {
    const confirmText = onConfirm ? 'Delete' : 'OK';
    showModal({ title, message, type: 'warning', confirmText, onConfirm });
  };

  const showInfo = (message, title = 'Information', onConfirm = null) => {
    showModal({ title, message, type: 'info', onConfirm });
  };

  return {
    modalState,
    showModal,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};
