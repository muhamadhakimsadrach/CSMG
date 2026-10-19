import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-lg">
            <Card className="p-8 text-center shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Terjadi Kesalahan Tampilan</h2>
              <p className="mt-2 text-sm text-slate-600">
                Aplikasi mengalami kendala saat merender antarmuka. Silakan muat ulang halaman atau atur ulang data sesi demo jika diperlukan.
              </p>
              {this.state.error && (
                <div className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-100 p-3 text-left font-mono text-xs text-red-700">
                  {this.state.error.toString()}
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Button
                  onClick={() => {
                    window.localStorage.clear();
                    window.location.reload();
                  }}
                  variant="danger"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Atur Ulang & Muat Ulang
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                >
                  Muat Ulang Halaman
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
