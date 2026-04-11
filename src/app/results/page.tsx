"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ResultData {
  candidateName: string;
  salaryExpectation: number;
  offeredSalary: number | null;
  department: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    const candidateId = localStorage.getItem("candidateId");
    const sessionId = localStorage.getItem("sessionId");

    if (!candidateId || !sessionId) {
      router.push("/");
      return;
    }

    async function loadResults() {
      // Adayın kendi bilgileri
      const { data: candidate } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      // Adaya yapılan teklif
      const { data: matching } = await supabase
        .from("matchings")
        .select("offered_salary")
        .eq("session_id", sessionId)
        .eq("candidate_id", candidateId)
        .single();

      if (candidate) {
        setResult({
          candidateName: candidate.name,
          salaryExpectation: candidate.salary_expectation,
          offeredSalary: matching?.offered_salary ?? null,
          department: candidate.department || "",
        });
      }

      setLoading(false);
    }

    loadResults();
  }, [router]);

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
          Sonuçlar yükleniyor...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center text-steel-400">
        Sonuç bulunamadı.
      </div>
    );
  }

  const diff =
    result.offeredSalary != null
      ? result.offeredSalary - result.salaryExpectation
      : null;
  const diffPercent =
    diff != null && result.salaryExpectation > 0
      ? ((diff / result.salaryExpectation) * 100).toFixed(1)
      : null;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-steel-100">
            Sonuçlarınız
          </h1>
          <p className="mt-2 text-steel-500">
            {result.candidateName} &middot; {result.department}
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          {/* Beklenti */}
          <div className="card text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-steel-500">
              Talep Ettiğiniz Maaş
            </p>
            <p className="font-mono text-3xl font-bold text-automotive-blue">
              {result.salaryExpectation.toLocaleString("tr-TR")}
            </p>
            <p className="mt-1 text-sm text-steel-500">TL / Ay</p>
          </div>

          {/* Teklif */}
          <div className="card text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-steel-500">
              Size Teklif Edilen Maaş
            </p>
            <p
              className={`font-mono text-3xl font-bold ${
                result.offeredSalary != null
                  ? "text-automotive-orange"
                  : "text-steel-600"
              }`}
            >
              {result.offeredSalary != null
                ? result.offeredSalary.toLocaleString("tr-TR")
                : "—"}
            </p>
            <p className="mt-1 text-sm text-steel-500">TL / Ay</p>
          </div>
        </div>

        {/* Difference */}
        {diff != null && (
          <div
            className={`card text-center ${
              diff >= 0
                ? "border-emerald-500/20"
                : "border-red-500/20"
            }`}
          >
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-steel-500">
              Fark
            </p>
            <p
              className={`font-mono text-2xl font-bold ${
                diff >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {diff >= 0 ? "+" : ""}
              {diff.toLocaleString("tr-TR")} TL
            </p>
            {diffPercent && (
              <p
                className={`mt-1 text-sm ${
                  diff >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                ({diff >= 0 ? "+" : ""}
                {diffPercent}%)
              </p>
            )}

            <div className="mx-auto mt-4 max-w-xs">
              {/* Visual bar comparison */}
              <div className="mb-2 flex items-center gap-3 text-xs text-steel-500">
                <span className="w-16 text-right">Beklenti</span>
                <div className="flex-1 overflow-hidden rounded-full bg-steel-800">
                  <div
                    className="h-3 rounded-full bg-automotive-blue transition-all duration-1000"
                    style={{
                      width: `${Math.min(
                        100,
                        (result.salaryExpectation /
                          Math.max(
                            result.salaryExpectation,
                            result.offeredSalary || 0
                          )) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-steel-500">
                <span className="w-16 text-right">Teklif</span>
                <div className="flex-1 overflow-hidden rounded-full bg-steel-800">
                  <div
                    className="h-3 rounded-full bg-automotive-orange transition-all duration-1000"
                    style={{
                      width: `${Math.min(
                        100,
                        ((result.offeredSalary || 0) /
                          Math.max(
                            result.salaryExpectation,
                            result.offeredSalary || 0
                          )) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <p className="mt-6 text-center text-xs text-steel-600">
          Bu sonuçlar anonimdir ve sadece size gösterilmektedir. Sınıf
          genelindeki analiz için admin paneline bakınız.
        </p>
      </div>
    </div>
  );
}
