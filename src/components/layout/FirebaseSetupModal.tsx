import React, { useState } from 'react';
import { isFirebaseConfigured } from '../../services/firebase';
import { Flame, Check, Copy, ExternalLink, Shield } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<Props> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const envSample = `# RevirFC Firebase Bağlantı Ayarları
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=revir-fc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=revir-fc
VITE_FIREBASE_STORAGE_BUCKET=revir-fc.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl relative my-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Firebase Altyapı Bağlantısı</h2>
              <p className="text-xs text-neutral-400">
                Oluşturduğunuz Firebase projesini RevirFC ekosistemine bağlama rehberi.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        {/* Current status */}
        <div
          className={`p-4 rounded-2xl border mb-4 flex items-center justify-between ${
            isFirebaseConfigured
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                isFirebaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-bold">
              {isFirebaseConfigured
                ? '🔥 Firebase Projeniz Başarıyla Bağlı ve Aktif!'
                : '⚡ Yerel Hibrit Demo Modu Aktif (Tüm Özellikler ve Kartlar Çalışıyor)'}
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
            {isFirebaseConfigured ? 'Firestore & Storage Canlı' : 'LocalStorage & Memory'}
          </span>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-xs text-neutral-300">
          <div>
            <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              1. Firebase Console'dan Web App Bilgilerini Alma:
            </h4>
            <p className="text-neutral-400 leading-relaxed">
              Firebase Console &gt; Project Settings &gt; General &gt; "Your apps" &gt; Web App ikonuna tıklayın ve SDK config kodlarını kopyalayın.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-amber-400">2. Proje Kökündeki .env Dosyasına Ekleyin:</h4>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-amber-300 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg border border-neutral-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopyalandı!' : 'Örnek Kodu Kopyala'}
              </button>
            </div>
            <pre className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
              {envSample}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> 3. Hazırlanan Güvenlik Kuralları (Soyunma Odası Güvenliği):
            </h4>
            <p className="text-neutral-400 leading-relaxed">
              Projeniz için <code>firestore.rules</code> ve <code>storage.rules</code> dosyaları otomatik üretildi. Onaysız hiçbir üye halı saha verilerini okuyamaz veya değiştiremez.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-6 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black"
          >
            Tamam, Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
