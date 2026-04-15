"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, Candidate, Matching } from "@/lib/types";
import {
  ExpectationVsOfferChart,
  GenderPayGapChart,
  DepartmentSalaryChart,
} from "@/components/Charts";

type Tab = "control" | "analytics";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("control");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matchings, setMatchings] = useState<Matching[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadSessionData = useCallback(async (sessionId: string) => {
    const [candRes, matchRes] = await Promise.all([
      supabase
        .from("candidates")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at"),
      supabase
        .from("matchings")
        .select("*")
        .eq("session_id", sessionId),
    ]);
    if (candRes.data) setCandidates(candRes.data);
    if (matchRes.data) setMatchings(matchRes.data);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    async function loadSessions() {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setSessions(data);
        setActiveSession(data[0]);
        loadSessionData(data[0].id);
      }
    }
    loadSessions();
  }, [loadSessionData]);

  // Realtime updates for candidates & matchings
  useEffect(() => {
    if (!activeSession) return;

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "candidates",
          filter: `session_id=eq.${activeSession.id}`,
        },
        () => loadSessionData(activeSession.id)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matchings",
          filter: `session_id=eq.${activeSession.id}`,
        },
        () => loadSessionData(activeSession.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession, loadSessionData]);

  function showMessage(type: string, text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  }

  // ─── Create Session ───
  async function createSession() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ code, status: "registration" })
      .select()
      .single();

    if (error) {
      showMessage("error", "Oturum oluşturulamadı: " + error.message);
      return;
    }
    if (data) {
      setSessions([data, ...sessions]);
      setActiveSession(data);
      setCandidates([]);
      setMatchings([]);
      showMessage("success", `Oturum oluşturuldu! Kod: ${data.code}`);
    }
  }

  // ─── Start Matching ───
  async function startMatching() {
    if (!activeSession) return;
    setLoading(true);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
      const result = await res.json();

      if (res.ok) {
        showMessage("success", result.message);
        setActiveSession({ ...activeSession, status: "evaluating" });
        loadSessionData(activeSession.id);
      } else {
        showMessage("error", result.error);
      }
    } catch {
      showMessage("error", "Bağlantı hatası");
    }

    setLoading(false);
  }

  // ─── Reveal Results ───
  async function revealResults() {
    if (!activeSession) return;
    setLoading(true);

    const { error } = await supabase
      .from("sessions")
      .update({
        status: "results",
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSession.id);

    if (error) {
      showMessage("error", "Sonuçlar açıklanamadı");
    } else {
      setActiveSession({ ...activeSession, status: "results" });
      showMessage("success", "Sonuçlar tüm öğrencilere açıklandı!");
    }

    setLoading(false);
  }

  // ─── Reset Session ───
  async function resetSession() {
    if (!activeSession) return;
    if (!confirm("Bu oturumu sıfırlamak istediğinize emin misiniz? Tüm veriler silinecek.")) return;

    setLoading(true);

    // Delete matchings, then candidates
    await supabase
      .from("matchings")
      .delete()
      .eq("session_id", activeSession.id);
    await supabase
      .from("candidates")
      .delete()
      .eq("session_id", activeSession.id);
    await supabase
      .from("sessions")
      .update({
        status: "registration",
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeSession.id);

    setActiveSession({ ...activeSession, status: "registration" });
    setCandidates([]);
    setMatchings([]);
    showMessage("success", "Oturum sıfırlandı");
    setLoading(false);
  }

  // Stats
  const completedProfiles = candidates.filter((c) => c.profile_completed).length;
  const completedEvals = matchings.filter((m) => m.offered_salary != null).length;
  const avgExpectation =
    candidates.length > 0
      ? candidates.reduce((sum, c) => sum + (c.salary_expectation || 0), 0) /
        candidates.filter((c) => c.salary_expectation > 0).length
      : 0;
  const avgOffer =
    completedEvals > 0
      ? matchings
          .filter((m) => m.offered_salary != null)
          .reduce((sum, m) => sum + m.offered_salary!, 0) / completedEvals
      : 0;

  // Top 5 profiles by offered salary
  const top5 = matchings
    .filter((m) => m.offered_salary != null)
    .sort((a, b) => b.offered_salary! - a.offered_salary!)
    .slice(0, 5)
    .map((m) => {
      const cand = candidates.find((c) => c.id === m.candidate_id);
      return { matching: m, candidate: cand };
    })
    .filter((x) => x.candidate != null);

  // En çok öne çıkan yetkinlikler
  const competencyCount: Record<string, number> = {};
  candidates.forEach((c) => {
    (c.competencies || []).forEach((comp) => {
      competencyCount[comp] = (competencyCount[comp] || 0) + 1;
    });
  });
  const topCompetencies = Object.entries(competencyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // En çok seçilen güçlü özellikler
  const strengthCount: Record<string, number> = {};
  candidates.forEach((c) => {
    (c.strengths || []).forEach((s) => {
      strengthCount[s] = (strengthCount[s] || 0) + 1;
    });
  });
  const topStrengths = Object.entries(strengthCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // En çok seçilen gelişime açık özellikler
  const weaknessCount: Record<string, number> = {};
  candidates.forEach((c) => {
    (c.weaknesses || []).forEach((w) => {
      weaknessCount[w] = (weaknessCount[w] || 0) + 1;
    });
  });
  const topWeaknesses = Object.entries(weaknessCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const statusLabel: Record<string, string> = {
    registration: "Kayıt Aşaması",
    evaluating: "Değerlendirme Aşaması",
    results: "Sonuçlar Açıklandı",
    closed: "Kapatıldı",
  };

  const statusColor: Record<string, string> = {
    registration: "badge-blue",
    evaluating: "badge-orange",
    results: "badge-green",
    closed: "badge border-steel-600 bg-steel-800 text-steel-400",
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-steel-100 sm:text-3xl">
            Admin Panel
          </h1>
          <p className="mt-1 text-sm text-steel-500">
            Oturum yönetimi ve sınıf analizi
          </p>
        </div>
        <button onClick={createSession} className="btn-primary">
          + Yeni Oturum Oluştur
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {!activeSession ? (
        <div className="card text-center text-steel-500">
          <p>Henüz oturum yok. Yeni bir oturum oluşturun.</p>
        </div>
      ) : (
        <>
          {/* Session Info + Code */}
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="card col-span-2 sm:col-span-1">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-steel-500">
                Oturum Kodu
              </p>
              <p className="font-mono text-3xl font-bold tracking-widest text-automotive-orange">
                {activeSession.code}
              </p>
            </div>
            <div className="stat-card">
              <p className="mb-1 text-xs font-medium uppercase text-steel-500">
                Durum
              </p>
              <span className={statusColor[activeSession.status] || "badge"}>
                {statusLabel[activeSession.status] || activeSession.status}
              </span>
            </div>
            <div className="stat-card">
              <p className="mb-1 text-xs font-medium uppercase text-steel-500">
                Katılımcı
              </p>
              <p className="text-2xl font-bold text-steel-100">
                {candidates.length}
              </p>
              <p className="text-xs text-steel-500">
                {completedProfiles} profil tamam
              </p>
            </div>
            <div className="stat-card">
              <p className="mb-1 text-xs font-medium uppercase text-steel-500">
                Değerlendirme
              </p>
              <p className="text-2xl font-bold text-steel-100">
                {completedEvals}/{matchings.length}
              </p>
              <p className="text-xs text-steel-500">tamamlandı</p>
            </div>
          </div>

          {/* Session Selector */}
          {sessions.length > 1 && (
            <div className="mb-6">
              <label className="label-text">Oturum Seç</label>
              <select
                className="select-field max-w-xs"
                value={activeSession.id}
                onChange={(e) => {
                  const s = sessions.find((s) => s.id === e.target.value);
                  if (s) {
                    setActiveSession(s);
                    loadSessionData(s.id);
                  }
                }}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {statusLabel[s.status]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg border border-steel-800 bg-steel-900/50 p-1">
            <button
              onClick={() => setTab("control")}
              className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                tab === "control"
                  ? "bg-steel-800 text-steel-100 shadow"
                  : "text-steel-500 hover:text-steel-300"
              }`}
            >
              Kontrol Paneli
            </button>
            <button
              onClick={() => setTab("analytics")}
              className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                tab === "analytics"
                  ? "bg-steel-800 text-steel-100 shadow"
                  : "text-steel-500 hover:text-steel-300"
              }`}
            >
              Analiz & Grafikler
            </button>
          </div>

          {/* ═══════════════ CONTROL TAB ═══════════════ */}
          {tab === "control" && (
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="card">
                <h3 className="section-title">Oturum Kontrolleri</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={startMatching}
                    disabled={
                      loading ||
                      activeSession.status !== "registration" ||
                      completedProfiles < 2
                    }
                    className="btn-primary"
                  >
                    {loading ? "İşleniyor..." : "Eşleşmeyi Başlat"}
                  </button>
                  <button
                    onClick={revealResults}
                    disabled={
                      loading || activeSession.status !== "evaluating"
                    }
                    className="btn-success"
                  >
                    Sonuçları Açıkla
                  </button>
                  <button
                    onClick={resetSession}
                    disabled={loading}
                    className="btn-danger"
                  >
                    Sıfırla
                  </button>
                </div>
                <p className="mt-3 text-xs text-steel-600">
                  {activeSession.status === "registration" &&
                    completedProfiles < 2 &&
                    `Eşleşme için en az 2 tamamlanmış profil gerekli (Şu an: ${completedProfiles})`}
                  {activeSession.status === "registration" &&
                    completedProfiles >= 2 &&
                    "Tüm öğrenciler profilini tamamladığında eşleşmeyi başlatın."}
                  {activeSession.status === "evaluating" &&
                    `Değerlendirme durumu: ${completedEvals}/${matchings.length} tamamlandı`}
                  {activeSession.status === "results" &&
                    "Sonuçlar tüm öğrencilere gösterildi."}
                </p>
              </div>

              {/* Candidates Table */}
              <div className="card">
                <h3 className="section-title">
                  Katılımcılar ({candidates.length})
                </h3>
                {candidates.length === 0 ? (
                  <p className="text-sm text-steel-600">
                    Henüz katılımcı yok.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-steel-800 text-left text-xs uppercase tracking-wider text-steel-500">
                          <th className="px-3 py-3">#</th>
                          <th className="px-3 py-3">İsim</th>
                          <th className="px-3 py-3">Departman</th>
                          <th className="px-3 py-3">Deneyim</th>
                          <th className="px-3 py-3">Beklenti</th>
                          <th className="px-3 py-3">Profil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((c, i) => (
                          <tr
                            key={c.id}
                            className="border-b border-steel-800/50 transition-colors hover:bg-steel-900/50"
                          >
                            <td className="px-3 py-3 font-mono text-steel-600">
                              {i + 1}
                            </td>
                            <td className="px-3 py-3 font-medium text-steel-200">
                              {c.name}
                            </td>
                            <td className="px-3 py-3 text-steel-400">
                              {c.department || "—"}
                            </td>
                            <td className="px-3 py-3 text-steel-400">
                              {c.experience_total} yıl
                            </td>
                            <td className="px-3 py-3 font-mono text-steel-300">
                              {c.salary_expectation > 0
                                ? c.salary_expectation.toLocaleString("tr-TR") +
                                  " TL"
                                : "—"}
                            </td>
                            <td className="px-3 py-3">
                              {c.profile_completed ? (
                                <span className="badge-green">Tamam</span>
                              ) : (
                                <span className="badge border-steel-600 bg-steel-800 text-steel-400">
                                  Bekliyor
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
          {tab === "analytics" && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="stat-card">
                  <p className="text-xs uppercase text-steel-500">
                    Ort. Beklenti
                  </p>
                  <p className="font-mono text-xl font-bold text-automotive-blue">
                    {avgExpectation > 0
                      ? Math.round(avgExpectation).toLocaleString("tr-TR")
                      : "—"}
                  </p>
                  <p className="text-xs text-steel-600">TL</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase text-steel-500">
                    Ort. Teklif
                  </p>
                  <p className="font-mono text-xl font-bold text-automotive-orange">
                    {avgOffer > 0
                      ? Math.round(avgOffer).toLocaleString("tr-TR")
                      : "—"}
                  </p>
                  <p className="text-xs text-steel-600">TL</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase text-steel-500">
                    Piyasa Farkı
                  </p>
                  <p
                    className={`font-mono text-xl font-bold ${
                      avgOffer >= avgExpectation
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {avgOffer > 0 && avgExpectation > 0
                      ? `${avgOffer >= avgExpectation ? "+" : ""}${Math.round(
                          ((avgOffer - avgExpectation) / avgExpectation) * 100
                        )}%`
                      : "—"}
                  </p>
                  <p className="text-xs text-steel-600">Teklif/Beklenti</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs uppercase text-steel-500">
                    Toplam Aday
                  </p>
                  <p className="font-mono text-xl font-bold text-steel-100">
                    {candidates.length}
                  </p>
                  <p className="text-xs text-steel-600">katılımcı</p>
                </div>
              </div>

              {/* Charts */}
              {completedEvals > 0 ? (
                <>
                  {/* Scatter Plot */}
                  <div className="card">
                    <div className="h-[400px]">
                      <ExpectationVsOfferChart
                        candidates={candidates}
                        matchings={matchings}
                      />
                    </div>
                  </div>

                  {/* Gender & Department Charts */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="card">
                      <div className="h-[350px]">
                        <GenderPayGapChart
                          candidates={candidates}
                          matchings={matchings}
                        />
                      </div>
                    </div>
                    <div className="card">
                      <div className="h-[350px]">
                        <DepartmentSalaryChart
                          candidates={candidates}
                          matchings={matchings}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── 3 Yeni İstatistik Bloğu ── */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* En çok öne çıkan yetkinlikler */}
                    <div className="card">
                      <h3 className="mb-4 text-base font-bold text-steel-100">
                        🏆 Öne Çıkan Yetkinlikler
                      </h3>
                      {topCompetencies.length > 0 ? (
                        <div className="space-y-3">
                          {topCompetencies.map(([comp, count], i) => (
                            <div key={comp}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-steel-300">{comp}</span>
                                <span className="text-automotive-orange font-mono">{count} kişi</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-steel-800">
                                <div
                                  className="h-full rounded-full bg-automotive-orange transition-all"
                                  style={{ width: `${(count / (topCompetencies[0]?.[1] || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-steel-600">Veri yok</p>
                      )}
                    </div>

                    {/* En çok seçilen güçlü özellikler */}
                    <div className="card">
                      <h3 className="mb-4 text-base font-bold text-steel-100">
                        💪 Öne Çıkan Güçlü Özellikler
                      </h3>
                      {topStrengths.length > 0 ? (
                        <div className="space-y-3">
                          {topStrengths.map(([trait, count]) => (
                            <div key={trait}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-steel-300">{trait}</span>
                                <span className="text-emerald-400 font-mono">{count} kişi</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-steel-800">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${(count / (topStrengths[0]?.[1] || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-steel-600">Veri yok</p>
                      )}
                    </div>

                    {/* En çok seçilen gelişime açık özellikler */}
                    <div className="card">
                      <h3 className="mb-4 text-base font-bold text-steel-100">
                        🌱 Öne Çıkan Gelişim Alanları
                      </h3>
                      {topWeaknesses.length > 0 ? (
                        <div className="space-y-3">
                          {topWeaknesses.map(([trait, count]) => (
                            <div key={trait}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-steel-300">{trait}</span>
                                <span className="text-red-400 font-mono">{count} kişi</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-steel-800">
                                <div
                                  className="h-full rounded-full bg-red-500 transition-all"
                                  style={{ width: `${(count / (topWeaknesses[0]?.[1] || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-steel-600">Veri yok</p>
                      )}
                    </div>
                  </div>

                  {/* Top 5 Table */}
                  <div className="card">
                    <h3 className="section-title">
                      En Yüksek Teklif Alan 5 Profil
                    </h3>
                    {top5.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-steel-800 text-left text-xs uppercase tracking-wider text-steel-500">
                              <th className="px-3 py-3">Sıra</th>
                              <th className="px-3 py-3">Aday ID</th>
                              <th className="px-3 py-3">Departman</th>
                              <th className="px-3 py-3">Deneyim</th>
                              <th className="px-3 py-3">Teklif</th>
                              <th className="px-3 py-3">Öne Çıkan Yetkinlikler</th>
                            </tr>
                          </thead>
                          <tbody>
                            {top5.map(({ matching: m, candidate: c }, i) => (
                              <tr
                                key={m.id}
                                className="border-b border-steel-800/50 transition-colors hover:bg-steel-900/50"
                              >
                                <td className="px-3 py-3">
                                  <span
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                      i === 0
                                        ? "bg-automotive-orange/20 text-automotive-orange"
                                        : i === 1
                                          ? "bg-steel-300/20 text-steel-300"
                                          : i === 2
                                            ? "bg-amber-700/20 text-amber-600"
                                            : "bg-steel-800 text-steel-500"
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                </td>
                                <td className="px-3 py-3 font-mono font-medium text-steel-200">
                                  {c!.display_id}
                                </td>
                                <td className="px-3 py-3 text-steel-400">
                                  {c!.department}
                                </td>
                                <td className="px-3 py-3 text-steel-400">
                                  {c!.experience_total} yıl
                                </td>
                                <td className="px-3 py-3 font-mono font-bold text-automotive-orange">
                                  {m.offered_salary!.toLocaleString("tr-TR")} TL
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {c!.competencies
                                      ?.slice(0, 4)
                                      .map((comp) => (
                                        <span
                                          key={comp}
                                          className="rounded bg-steel-800 px-2 py-0.5 text-xs text-steel-300"
                                        >
                                          {comp}
                                        </span>
                                      ))}
                                    {(c!.competencies?.length || 0) > 4 && (
                                      <span className="text-xs text-steel-600">
                                        +{c!.competencies!.length - 4}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-steel-600">
                        Henüz teklif verilmemiş.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="card py-16 text-center text-steel-500">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-steel-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                  <p>
                    Grafikleri görüntülemek için değerlendirme aşamasının
                    tamamlanması gerekiyor.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
