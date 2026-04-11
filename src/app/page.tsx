"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sessionCode.trim() || !name.trim()) {
      setError("Lütfen oturum kodu ve isminizi girin.");
      return;
    }

    setLoading(true);
    try {
      // Oturumu bul
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", sessionCode.trim().toUpperCase())
        .single();

      if (sessionErr || !session) {
        setError("Oturum bulunamadı. Kodu kontrol edin.");
        setLoading(false);
        return;
      }

      if (session.status !== "registration") {
        setError("Bu oturum artık kayıt kabul etmiyor.");
        setLoading(false);
        return;
      }

      // Aday oluştur
      const { data: candidate, error: candErr } = await supabase
        .from("candidates")
        .insert({
          session_id: session.id,
          name: name.trim(),
          profile_completed: false,
        })
        .select()
        .single();

      if (candErr || !candidate) {
        setError("Katılım sırasında bir hata oluştu.");
        setLoading(false);
        return;
      }

      // localStorage'a kaydet
      localStorage.setItem("candidateId", candidate.id);
      localStorage.setItem("sessionId", session.id);
      localStorage.setItem("candidateName", name.trim());

      router.push("/candidate");
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center">
      {/* Logo / Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-steel-700 bg-steel-900">
          <svg
            className="h-10 w-10 text-automotive-orange animate-spin-slow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-automotive-orange">Otomotiv</span> Sektörü
        </h1>
        <h2 className="text-xl font-light text-steel-400 sm:text-2xl">
          Ücretlendirme Simülasyonu
        </h2>
        <p className="mt-3 max-w-md text-sm text-steel-500">
          Aday profilini oluştur, anonim olarak değerlendir ve piyasa
          dinamiklerini keşfet.
        </p>
      </div>

      {/* Join Form */}
      <form
        onSubmit={handleJoin}
        className="card w-full max-w-md animate-pulse-glow"
      >
        <h3 className="mb-6 text-center text-lg font-semibold text-steel-200">
          Oturuma Katıl
        </h3>

        <div className="mb-4">
          <label className="label-text">Oturum Kodu</label>
          <input
            type="text"
            className="input-field text-center font-mono text-lg tracking-widest uppercase"
            placeholder="ABC123"
            maxLength={6}
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
          />
        </div>

        <div className="mb-6">
          <label className="label-text">Ad Soyad</label>
          <input
            type="text"
            className="input-field"
            placeholder="Adınızı ve soyadınızı girin"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="mt-1 text-xs text-steel-600">
            * İsminiz değerlendiriciye gösterilmeyecektir.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Katılıyor...
            </span>
          ) : (
            "Katıl"
          )}
        </button>
      </form>

      {/* Admin link */}
      <button
        onClick={() => router.push("/admin")}
        className="mt-8 text-sm text-steel-600 underline-offset-4 transition-colors hover:text-steel-400 hover:underline"
      >
        Admin Paneli
      </button>
    </div>
  );
}
