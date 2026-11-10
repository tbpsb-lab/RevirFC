import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Clock, ShieldCheck, RefreshCw } from 'lucide-react';

export const PendingApprovalGate: React.FC = () => {
  const { currentUser, switchMockRole } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl relative">
        <img
          src="/logo.jpg"
          alt="Revir FC Emblem"
          className="w-20 h-20 rounded-full object-cover border-2 border-amber-400/50 shadow-xl shadow-amber-500/25 mx-auto mb-4"
        />

        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          ÖZEL KULÜP ERİŞİM KİLİDİ
        </span>

        <h2 className="text-xl font-black text-white mt-4">
          Üyelik Başvurunuz Onay Bekliyor
        </h2>

        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
          RevirFC 22 kişilik kemik kadroya özel kapalı devre bir halı saha kulübüdür. Hesabınız (<strong>{currentUser?.email}</strong>) kulüp yöneticisi Alper'in onayına sunulmuştur.
        </p>

        <div className="my-6 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
            <Clock className="w-4 h-4 text-amber-400" /> Yönetici Paneline Bildirim Gönderildi
          </div>
          <p className="text-[11px] text-neutral-500">
            Kulüp yöneticisi Alper hesabınızı onayladığında ve kartınızla eşleştirdiğinde soyunma odasının tüm kapıları açılacaktır.
          </p>
        </div>

        {/* Demo Switcher for fast review */}
        <div className="pt-4 border-t border-neutral-800">
          <span className="text-[11px] text-neutral-400 block mb-2 font-semibold">
            Test Deneyimi: Yönetici Rolüne Geçip Onaylamak İçin:
          </span>
          <button
            onClick={() => switchMockRole('admin')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" /> Yönetici Olarak Giriş Yap & Üyeyi Onayla
          </button>
        </div>
      </div>
    </div>
  );
};
