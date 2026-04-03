import React, { useState } from 'react';

const Modal = ({ isOpen, onClose, title, message, type = 'info', confirmText = 'OK', onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconBg: '#10B981',
          titleColor: '#059669'
        };
      case 'error':
        return {
          icon: '✕',
          iconBg: '#EF4444',
          titleColor: '#DC2626'
        };
      case 'warning':
        return {
          icon: '⚠',
          iconBg: '#F59E0B',
          titleColor: '#D97706'
        };
      default:
        return {
          icon: 'ℹ',
          iconBg: '#3B82F6',
          titleColor: '#2563EB'
        };
    }
  };

  const typeStyles = getTypeStyles();

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        await onConfirm();
      } catch (error) {
        console.error('Modal confirm error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{...styles.iconContainer, background: typeStyles.iconBg}}>
          <span style={styles.icon}>{typeStyles.icon}</span>
        </div>
        
        <h2 style={{...styles.title, color: typeStyles.titleColor}}>
          {title}
        </h2>
        
        <p style={styles.message}>{message}</p>
        
        <div style={onConfirm ? styles.buttonGroup : styles.singleButtonGroup}>
          {onConfirm && (
            <button 
              onClick={onClose}
              style={{
                ...styles.cancelButton,
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button 
            onClick={handleConfirm}
            style={{
              ...(onConfirm ? styles.confirmButton : styles.button),
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    textAlign: 'center',
    animation: 'slideIn 0.3s ease-out'
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    fontSize: '32px',
    color: 'white',
    fontWeight: 'bold'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  message: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '24px',
    lineHeight: '1.5',
    whiteSpace: 'pre-line'
  },
  button: {
    background: '#173B66',
    color: 'white',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    width: '100%'
  },
  singleButtonGroup: {
    width: '100%'
  },
  confirmButton: {
    background: '#173B66',
    color: 'white',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
    transition: 'background 0.2s'
  },
  cancelButton: {
    background: '#e2e8f0',
    color: '#64748b',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
    transition: 'background 0.2s'
  }
};

export default Modal;
