import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DevOS from '../components/DevOS';
import { CheckCircle2, X } from 'lucide-react';

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ msg, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700">
      <CheckCircle2 size={16} className="text-green-400 shrink-0" />
      <span className="text-sm font-medium">{msg}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><X size={14} /></button>
    </div>
  );
}

/* ─── End Test Confirm Modal ─────────────────────────────────────────────── */
function EndTestModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-[#16191c] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <X size={24} className="text-red-400" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">End VM Test?</h3>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          This will submit your work for AI review. Your code and browser activity have been recorded.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-white/10 text-gray-400 hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            Continue Test
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            End & Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── VM Live Page ───────────────────────────────────────────────────────── */
export default function VMLive() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);

  // Context passed from VMLaunch
  const jobTitle = location.state?.jobTitle || 'VM Test';

  const handleExit = () => {
    // DevOS calls this when user clicks "End Test" in the taskbar
    setShowEndModal(true);
  };

  const handleConfirmEnd = () => {
    setShowEndModal(false);
    setToast('✅ Test submitted! Results will be ready in 24 hours.');
    setTimeout(() => navigate('/bidder-management'), 3000);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* DevOS fills the entire screen */}
      <DevOS onExit={handleExit} onLog={() => {}} />

      {/* End confirm modal sits above DevOS */}
      {showEndModal && (
        <EndTestModal
          onConfirm={handleConfirmEnd}
          onCancel={() => setShowEndModal(false)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
}
