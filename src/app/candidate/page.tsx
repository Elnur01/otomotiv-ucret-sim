"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEPARTMENTS,
  COMPETENCIES,
  COMPUTER_SKILLS,
  LANGUAGES,
  LANGUAGE_LEVELS,
  PERSONAL_TRAITS,
} from "@/lib/constants";
import type { LanguageEntry, Session } from "@/lib/types";

export default function CandidatePage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "waiting">("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [department, setDepartment] = useState("");
  const [educationSchool, setEducationSchool] = useState("");
  const [educationField, setEducationField] = useState("");
  const [lastCompany, setLastCompany] = useState("");
  const [experienceTotal, setExperienceTotal] = useState("");
  const [experienceField, setExperienceField] = useState("");
  const [languages, setLanguages] = useState<LanguageEntry[]>([
    { language: "", level: "" },
  ]);
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [computerSkills, setComputerSkills] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [salaryExpectation, setSalaryExpectation] = useState("");

  // Session state
  const [sessionStatus, setSessionStatus] = useState<string>("registration");

  const handleSessionChange = useCallback(
    (payload: { new: Session }) => {
      const newStatus = payload.new.status;
      setSessionStatus(newStatus);
      if (newStatus === "evaluating") router.push("/evaluate");
      else if (newStatus === "results") router.push("/results");
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

    supabase
      .from("candidates")
      .select("profile_completed")
      .eq("id", candidateId)
      .single()
      .then(({ data }) => {
        if (data?.profile_completed) setStep("waiting");
      });

    supabase
      .from("sessions")
      .select("status")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSessionStatus(data.status);
          if (data.status === "evaluating") router.push("/evaluate");
          if (data.status === "results") router.push("/results");
        }
      });

    const channel = supabase
      .channel("session-status")
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

    return () => { supabase.removeChannel(channel); };
  }, [router, handleSessionChange]);

  function addLanguage() {
    setLanguages([...languages, { language: "", level: "" }]);
  }

  function removeLanguage(idx: number) {
    setLanguages(languages.filter((_, i) => i !== idx));
  }

  function updateLanguage(idx: number, field: keyof LanguageEntry, val: string) {
    const updated = [...languages];
    updated[idx] = { ...updated[idx], [field]: val };
    setLanguages(updated);
  }

  function toggleCompetency(comp: string) {
    if (competencies.includes(comp)) {
      setCompetencies(competencies.filter((c) => c !== comp));
    } else if (competencies.length < 5) {
      setCompetencies([...competencies, comp]);
    }
  }

  function toggleComputerSkill(skill: string) {
    if (computerSkills.includes(skill)) {
      setComputerSkills(computerSkills.filter((s) => s !== skill));
    } else {
      setComputerSkills([...computerSkills, skill]);
    }
  }

  function toggleStrength(trait: string) {
    if (strengths.includes(trait)) {
      setStrengths(strengths.filter((s) => s !== trait));
    } else if (strengths.length < 5) {
      setStrengths([...strengths, trait]);
    }
  }

  function toggleWeakness(trait: string) {
    if (weaknesses.includes(trait)) {
      setWeaknesses(weaknesses.filter((w) => w !== trait));
    } else if (weaknesses.length < 2) {
      setWeaknesses([...weaknesses, trait]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!age || !gender || !department) {
      setError("Lütfen yaş, cinsiyet ve bölüm alanlarını doldurun.");
      return;
    }
    if (!educationSchool || !educationField) {
      setError("Lütfen eğitim bilgilerinizi doldurun.");
      return;
    }
    if (competencies.length === 0) {
      setError("En az 1 yetkinlik seçmelisiniz.");
      return;
    }
    if (strengths.length !== 5) {
      setError("Lütfen tam olarak 5 güçlü özellik seçin.");
      return;
    }
    if (weaknesses.length !== 2) {
      setError("Lütfen tam olarak 2 gelişime açık özellik seçin.");
      return;
    }
    if (!salaryExpectation || Number(salaryExpectation) <= 0) {
      setError("Lütfen geçerli bir maaş beklentisi girin.");
      return;
    }

    setSaving(true);
    const candidateId = localStorage.getItem("candidateId");
    const validLanguages = languages.filter((l) => l.language && l.level);

    const { error: updateErr } = await supabase
      .from("candidates")
      .update({
        age: Number(age),
        gender,
        department,
        education_school: educationSchool,
        education_field: educationField,
        last_company: lastCompany || null,
        experience_total: Number(experienceTotal) || 0,
        experience_field: Number(experienceField) || 0,
        languages: validLanguages,
        competencies,
        computer_skills: computerSkills,
        strengths,
        weaknesses,
        salary_expectation: Number(salaryExpectation),
        profile_completed: true,
      })
      .eq("id", candidateId);

    setSaving(false);

    if (updateErr) {
      setError("Profil kaydedilemedi. Tekrar deneyin.");
      return;
    }

    setStep("waiting");
  }

  // ─── WAITING SCREEN ───
  if (step === "waiting") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="card max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-automotive-green/30 bg-automotive-green/10">
            <svg className="h-8 w-8 text-automotive-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-steel-100">Profiliniz Kaydedildi!</h2>
          <p className="mb-4 text-steel-400">Eğitmenin eşleşmeyi başlatması bekleniyor...</p>
          <div className="flex items-center justify-center gap-2 text-sm text-steel-500">
            <div className="h-2 w-2 animate-pulse rounded-full bg-automotive-orange" />
            Oturum Durumu: <span className="badge-orange capitalize">{sessionStatus}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── PROFILE FORM ───
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-steel-100 sm:text-3xl">Aday Profil Formu</h1>
        <p className="mt-2 text-sm text-steel-500">
          Bilgilerinizi eksiksiz doldurun. İsminiz değerlendiriciye{" "}
          <strong className="text-automotive-orange">gösterilmeyecektir</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── 1. KİŞİSEL BİLGİLER ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-automotive-orange/10 text-sm font-bold text-automotive-orange">1</span>
            Kişisel Bilgiler
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Yaş</label>
              <input type="number" className="input-field" placeholder="25" min={18} max={65}
                value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Cinsiyet</label>
              <select className="select-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Seçiniz</option>
                <option value="Kadın">Kadın</option>
                <option value="Erkek">Erkek</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 2. KURUMSAL DETAYLAR ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-automotive-indigo/10 text-sm font-bold text-automotive-indigo">2</span>
            Kurumsal Detaylar
          </h3>

          <div className="mb-4">
            <label className="label-text">Bölüm</label>
            <select className="select-field" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Bölüm Seçiniz</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Okul</label>
              <select className="select-field" value={educationSchool} onChange={(e) => setEducationSchool(e.target.value)}>
                <option value="">Üniversite Seçiniz</option>
                <option value="İTÜ">İTÜ (İstanbul Teknik Üniversitesi)</option>
                <option value="ODTÜ">ODTÜ</option>
                <option value="Boğaziçi Üniversitesi">Boğaziçi Üniversitesi</option>
                <option value="Hacettepe Üniversitesi">Hacettepe Üniversitesi</option>
                <option value="İstanbul Üniversitesi">İstanbul Üniversitesi</option>
                <option value="Ankara Üniversitesi">Ankara Üniversitesi</option>
                <option value="Bilkent Üniversitesi">Bilkent Üniversitesi</option>
                <option value="Koç Üniversitesi">Koç Üniversitesi</option>
                <option value="Sabancı Üniversitesi">Sabancı Üniversitesi</option>
                <option value="Yıldız Teknik Üniversitesi">Yıldız Teknik Üniversitesi</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div>
              <label className="label-text">Bölüm Adı</label>
              <input type="text" className="input-field" placeholder="Bölüm adı"
                value={educationField} onChange={(e) => setEducationField(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <label className="label-text">Son Çalıştığınız Şirket <span className="text-steel-600">(opsiyonel)</span></label>
            <input type="text" className="input-field" placeholder="Şirket adı"
              value={lastCompany} onChange={(e) => setLastCompany(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Toplam İş Deneyimi (Yıl)</label>
              <input type="number" className="input-field" placeholder="0" min={0} max={40}
                value={experienceTotal} onChange={(e) => setExperienceTotal(e.target.value)} />
            </div>
            <div>
              <label className="label-text">Alandaki Deneyim (Yıl)</label>
              <input type="number" className="input-field" placeholder="0" min={0} max={40}
                value={experienceField} onChange={(e) => setExperienceField(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── 3. DİL BİLGİLERİ ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-automotive-green/10 text-sm font-bold text-automotive-green">3</span>
            Dil Bilgileri
          </h3>
          {languages.map((lang, idx) => (
            <div key={idx} className="mb-3 flex items-end gap-3">
              <div className="flex-1">
                <label className="label-text">Dil</label>
                <select className="select-field" value={lang.language}
                  onChange={(e) => updateLanguage(idx, "language", e.target.value)}>
                  <option value="">Seçiniz</option>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="label-text">Seviye</label>
                <select className="select-field" value={lang.level}
                  onChange={(e) => updateLanguage(idx, "level", e.target.value)}>
                  <option value="">Seviye</option>
                  {LANGUAGE_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
                </select>
              </div>
              {languages.length > 1 && (
                <button type="button" onClick={() => removeLanguage(idx)}
                  className="mb-0.5 rounded-lg border border-red-500/30 p-2.5 text-red-400 transition-colors hover:bg-red-500/10">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addLanguage} className="btn-secondary mt-2 text-sm">+ Dil Ekle</button>
        </div>

        {/* ── 4. YETKİNLİKLER ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-automotive-blue/10 text-sm font-bold text-automotive-blue">4</span>
            Yetkinlikler
            <span className="ml-auto text-sm font-normal text-steel-500">{competencies.length}/5</span>
          </h3>
          <p className="mb-4 text-sm text-steel-500">Size uygun yetkinlikleri seçin (maksimum 5).</p>
          <div className="flex flex-wrap gap-2">
            {COMPETENCIES.map((comp) => {
              const selected = competencies.includes(comp);
              return (
                <button key={comp} type="button" onClick={() => toggleCompetency(comp)}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    selected
                      ? "border-automotive-orange bg-automotive-orange/15 text-automotive-orange"
                      : "border-steel-700 text-steel-400 hover:border-steel-500 hover:text-steel-300"
                  } ${!selected && competencies.length >= 5 ? "cursor-not-allowed opacity-40" : ""}`}>
                  {comp}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 5. BİLGİSAYAR BİLGİSİ ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-sm font-bold text-cyan-400">5</span>
            Bilgisayar Bilgisi
          </h3>
          <p className="mb-4 text-sm text-steel-500">Kullandığınız yazılım ve araçları seçin.</p>
          <div className="flex flex-wrap gap-2">
            {COMPUTER_SKILLS.map((skill) => {
              const selected = computerSkills.includes(skill);
              return (
                <button key={skill} type="button" onClick={() => toggleComputerSkill(skill)}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    selected
                      ? "border-cyan-400 bg-cyan-400/15 text-cyan-400"
                      : "border-steel-700 text-steel-400 hover:border-steel-500 hover:text-steel-300"
                  }`}>
                  {skill}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 6. KİŞİSEL ANALİZ ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-sm font-bold text-purple-400">6</span>
            Kişisel Analiz
          </h3>

          <div className="mb-6">
            <label className="label-text">En Güçlü 5 Özelliğiniz <span className="text-steel-500">({strengths.length}/5)</span></label>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_TRAITS.map((trait) => {
                const selected = strengths.includes(trait);
                const isWeakness = weaknesses.includes(trait);
                return (
                  <button key={`s-${trait}`} type="button" onClick={() => toggleStrength(trait)} disabled={isWeakness}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                        : isWeakness
                          ? "cursor-not-allowed border-steel-800 text-steel-700"
                          : "border-steel-700 text-steel-400 hover:border-steel-500"
                    } ${!selected && !isWeakness && strengths.length >= 5 ? "cursor-not-allowed opacity-40" : ""}`}>
                    {trait}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label-text">Gelişime Açık 2 Özelliğiniz <span className="text-steel-500">({weaknesses.length}/2)</span></label>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_TRAITS.map((trait) => {
                const selected = weaknesses.includes(trait);
                const isStrength = strengths.includes(trait);
                return (
                  <button key={`w-${trait}`} type="button" onClick={() => toggleWeakness(trait)} disabled={isStrength}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      selected
                        ? "border-red-500 bg-red-500/15 text-red-400"
                        : isStrength
                          ? "cursor-not-allowed border-steel-800 text-steel-700"
                          : "border-steel-700 text-steel-400 hover:border-steel-500"
                    } ${!selected && !isStrength && weaknesses.length >= 2 ? "cursor-not-allowed opacity-40" : ""}`}>
                    {trait}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 7. MAAŞ BEKLENTİSİ ── */}
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-automotive-orange/10 text-sm font-bold text-automotive-orange">7</span>
            Maaş Beklentisi
          </h3>
          <label className="label-text">Aylık Net Maaş Beklentiniz (TL)</label>
          <input type="number" className="input-field text-lg font-mono" placeholder="35000" min={0}
            value={salaryExpectation} onChange={(e) => setSalaryExpectation(e.target.value)} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <button type="submit" className="btn-primary w-full text-lg" disabled={saving}>
          {saving ? "Kaydediliyor..." : "Profili Kaydet ve Devam Et"}
        </button>
      </form>
    </div>
  );
}
