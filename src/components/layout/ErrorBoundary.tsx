import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Beklenmeyen bir render hatasında tüm sayfanın siyah ekrana düşmesini engeller.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uygulama hatası:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h1 className="text-lg font-black">Bir şeyler ters gitti</h1>
          <p className="text-xs text-neutral-400 break-words">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs"
          >
            Tekrar dene
          </button>
          <button
            onClick={() => window.location.reload()}
            className="ml-2 px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 font-bold text-xs"
          >
            Sayfayı yenile
          </button>
        </div>
      </div>
    );
  }
}
