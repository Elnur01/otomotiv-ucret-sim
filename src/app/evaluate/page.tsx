"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Candidate, Session } from "@/lib/types";

export default function EvaluatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [offeredSalary, setOfferedSalary] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);

  const handleSessionChange = useCallback(
    (payload: { new: Session }) => {
      if (payload.new.status === "results") {
        router.push("/results");
      }
    },
    [router]
  );

  useEffect(() => {
    const candidateId = localStorage.getItem("candidateId");
    const sessionId = localStorage.getItem("sessionId");

    if (!candidateId || !sessionId) {
      router.push("/");
      return;
    }

    async function loadMatching() {
      // Bu kullanıcının değerlendirmesi gereken eşleşmeyi bul
      const { data: matching } = await supabase
        .from("matchings")
        .select("*")
        .eq("session_id", sessionId)
        .eq("evaluator_id", candidateId)
        .single();

      if (!matching) {
        setError("Eşleşme bulunamadı. Lütfen bekleyin.");
        setLoading(false);
        return;
      }

      setMatchingId(matching.id);

      // Zaten değerlendirilmiş mi?
      if (matching.offered_salary != null) {
        setSubmitted(true);
        setOfferedSalary(String(matching.offered_salary));
      }

      // Değerlendirilecek adayın profilini getir
      const { data: cand } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", matching.candidate_id)
        .single();

      if (cand) {
        setCandidate(cand);
      }

      setLoading(false);
    }

    loadMatching();

    // Realtime: oturum durumu değişirse
    const channel = supabase
      .channel("eval-session")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        handleSessionChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, handleSessionChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offeredSalary || Number(offeredSalary) <= 0) {
      setError("Lütfen geçerli bir maaş teklifi girin.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: updateErr } = await supabase
      .from("matchings")
      .update({
        offered_salary: Number(offeredSalary),
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", matchingId);

    setSubmitting(false);

    if (updateErr) {
      setError("Teklif kaydedilemedi. Tekrar deneyin.");
      return;
    }

    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex items-center gap-3 text-steel-400">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
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
          Eşleşme yükleniyor...
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="card max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-automotive-green/30 bg-automotive-green/10">
            <svg
              className="h-8 w-8 text-automotive-green"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-steel-100">
            Teklifiniz Kaydedildi!
          </h2>
          <p className="mb-4 text-steel-400">
            Teklif:{" "}
            <span className="font-mono text-lg font-bold text-automotive-orange">
              {Number(offeredSalary).toLocaleString("tr-TR")} TL
            </span>
          </p>
          <p className="text-sm text-steel-500">
            Sonuçların açıklanması bekleniyor...
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-steel-500">
            <div className="h-2 w-2 animate-pulse rounded-full bg-automotive-orange" />
            Bekleniyor
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center text-steel-400">
        Aday profili bulunamadı.
      </div>
    );
  }

  // Parse languages
  const langs: { language: string; level: string }[] = Array.isArray(
    candidate.languages
  )
    ? candidate.languages
    : [];

  return (
    <div className="mx-auto max-w-3xl py-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 inline-block rounded-full border border-automotive-indigo/30 bg-automotive-indigo/10 px-4 py-1 text-sm text-automotive-indigo">
          Recruiter Modu
        </div>
        <h1 className="text-2xl font-bold text-steel-100 sm:text-3xl">
          Aday Değerlendirme
        </h1>
        <p className="mt-2 text-sm text-steel-500">
          Aşağıdaki anonim profili inceleyip maaş teklifinizi belirleyin.
        </p>
      </div>

      {/* Anonymous Profile Card */}
      <div className="card gradient-border mb-8">
        {/* Aday ID */}
        <div className="mb-6 flex items-center gap-3 border-b border-steel-800 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-automotive-orange/10 font-mono text-lg font-bold text-automotive-orange">
            {candidate.display_id?.split("-")[1] || "?"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-steel-100">
              {candidate.display_id || "Anonim Aday"}
            </h2>
            <p className="text-sm text-steel-500">
              {candidate.department} &middot; {candidate.age} yaş
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Eğitim */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel-500">
              Eğitim
            </h4>
            <p className="text-steel-200">
              {candidate.education_school}
            </p>
            <p className="text-sm text-steel-400">
              {candidate.education_field}
            </p>
          </div>

          {/* Deneyim */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel-500">
              Deneyim
            </h4>
            <p className="text-steel-200">
              Toplam: {candidate.experience_total} yıl
            </p>
            <p className="text-sm text-steel-400">
              Alan: {candidate.experience_field} yıl
            </p>
          </div>

          {/* Diller */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel-500">
              Dil Bilgileri
            </h4>
            {langs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {langs.map((l, i) => (
                  <span key={i} className="badge-blue">
                    {l.language} ({l.level})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-steel-600">Belirtilmemiş</p>
            )}
          </div>

          {/* Departman */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel-500">
              Departman
            </h4>
            <span className="badge-orange">{candidate.department}</span>
          </div>
        </div>

        {/* Yetkinlikler */}
        <div className="mt-6 border-t border-steel-800 pt-6">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-steel-500">
            Yetkinlikler
          </h4>
          <div className="flex flex-wrap gap-2">
            {candidate.competencies?.map((comp) => (
              <span
                key={comp}
                className="rounded-full border border-automotive-orange/20 bg-automotive-orange/5 px-3 py-1 text-sm text-automotive-orange"
              >
                {comp}
              </span>
            ))}
          </div>
        </div>

        {/* Güçlü ve Zayıf Yönler */}
        <div className="mt-6 grid gap-4 border-t border-steel-800 pt-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-500">
              Güçlü Yönler
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.strengths?.map((s) => (
                <span key={s} className="badge-green">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">
              Gelişime Açık
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.weaknesses?.map((w) => (
                <span
                  key={w}
                  className="badge border-red-500/30 bg-red-500/10 text-red-400"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Salary Offer Form */}
      <form onSubmit={handleSubmit} className="card">
        <h3 className="mb-4 text-lg font-bold text-steel-100">
          Maaş Teklifiniz
        </h3>
        <p className="mb-4 text-sm text-steel-500">
          Yukarıdaki profili değerlendirerek bu adaya teklif ettiğiniz aylık net
          maaşı girin.
        </p>
        <div className="mb-4">
          <label className="label-text">Teklif Edilen Maaş (TL)</label>
          <input
            type="number"
            className="input-field font-mono text-xl"
            placeholder="35000"
            min={0}
            value={offeredSalary}
            onChange={(e) => setOfferedSalary(e.target.value)}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full text-lg"
          disabled={submitting}
        >
          {submitting ? "Kaydediliyor..." : "Teklifi Gönder"}
        </button>
      </form>
    </div>
  );
}
