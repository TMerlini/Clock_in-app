import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import './SessionEditor.css';

export function DeleteConfirmation({ session, onClose, onUpdate }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const sessionRef = doc(db, 'sessions', session.id);
      await deleteDoc(sessionRef);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Session</h2>
          <button className="close-button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-message">
            <AlertTriangle />
            <span>Are you sure you want to delete this session? This action cannot be undone.</span>
          </div>

          <div className="delete-session-info">
            <p><strong>Clock In:</strong> {format(new Date(session.clockIn), 'MMM dd, yyyy HH:mm:ss')}</p>
            <p><strong>Clock Out:</strong> {format(new Date(session.clockOut), 'MMM dd, yyyy HH:mm:ss')}</p>
            <p><strong>Total Hours:</strong> {session.totalHours.toFixed(2)}h</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="delete-button"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 />
            {deleting ? 'Deleting...' : 'Delete Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
