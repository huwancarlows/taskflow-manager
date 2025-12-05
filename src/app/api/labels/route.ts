export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data, error } = await supabase
      .from("labels")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ labels: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "labels.GET" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    type ReqLabel = { id: string; name: string; color: string };
    const rows: ReqLabel[] = Array.isArray(body) ? body : [body];
    if (!rows.length || !rows[0]?.name) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    const payload = rows.map((r) => ({ id: r.id, name: r.name, color: r.color, user_id: user.id }));
    const { error } = await supabase.from("labels").insert(payload);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "labels.POST" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const id: string = body?.id;
    const updates: Record<string, unknown> = {};
    if (body?.name !== undefined) updates.name = body.name;
    if (body?.color !== undefined) updates.color = body.color;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const { error } = await supabase.from("labels").update(updates).eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "labels.PUT" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const { error } = await supabase.from("labels").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "labels.DELETE" }, { status: 500 });
  }
}
