import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Dairesel Eşleşme (Circular Shift) Algoritması
 *
 * 1. Tüm adayları rastgele sıralar
 * 2. Her aday dizide kendisinden sonraki kişiyi değerlendirir
 * 3. Son kişi birinci kişiyi değerlendirir
 *
 * Sonuç: Herkes tam 1 kişiyi değerlendirir ve 1 kişiden teklif alır
 */
function circularMatch(candidateIds: string[]) {
  // Fisher-Yates shuffle
  const shuffled = [...candidateIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((evaluatorId, index) => ({
    evaluator_id: evaluatorId,
    candidate_id: shuffled[(index + 1) % shuffled.length],
  }));
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId gerekli" },
        { status: 400 }
      );
    }

    // Oturumu kontrol et
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Oturum bulunamadı" },
        { status: 404 }
      );
    }

    if (session.status !== "registration") {
      return NextResponse.json(
        { error: "Oturum zaten eşleşme aşamasında veya tamamlanmış" },
        { status: 400 }
      );
    }

    // Profili tamamlamış adayları getir
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id")
      .eq("session_id", sessionId)
      .eq("profile_completed", true);

    if (candidatesError) {
      return NextResponse.json(
        { error: "Adaylar yüklenemedi" },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length < 2) {
      return NextResponse.json(
        { error: "En az 2 aday gerekli (profil tamamlamış)" },
        { status: 400 }
      );
    }

    // Anonim ID'leri ata
    const shuffledForIds = [...candidates].sort(() => Math.random() - 0.5);
    const idUpdates = shuffledForIds.map((c, i) => ({
      id: c.id,
      display_id: `Aday-${String(i + 1).padStart(3, "0")}`,
    }));

    for (const update of idUpdates) {
      await supabase
        .from("candidates")
        .update({ display_id: update.display_id })
        .eq("id", update.id);
    }

    // Dairesel eşleşmeyi oluştur
    const candidateIds = candidates.map((c) => c.id);
    const matchings = circularMatch(candidateIds);

    // Mevcut eşleşmeleri temizle
    await supabase.from("matchings").delete().eq("session_id", sessionId);

    // Yeni eşleşmeleri kaydet
    const { error: matchError } = await supabase.from("matchings").insert(
      matchings.map((m) => ({
        session_id: sessionId,
        evaluator_id: m.evaluator_id,
        candidate_id: m.candidate_id,
      }))
    );

    if (matchError) {
      console.error("Eşleşme kayıt hatası:", matchError);
      return NextResponse.json(
        { error: "Eşleşmeler kaydedilemedi: " + matchError.message },
        { status: 500 }
      );
    }

    // Oturum durumunu güncelle
    await supabase
      .from("sessions")
      .update({ status: "evaluating", updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({
      success: true,
      matchCount: matchings.length,
      message: `${matchings.length} eşleşme oluşturuldu`,
    });
  } catch (err) {
    console.error("Match API error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
