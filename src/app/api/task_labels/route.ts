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
      .from("task_labels")
      .select("task_id, label_id")
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ taskLabels: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "task_labels.GET" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const rows = Array.isArray(body) ? body : [body];
    const insertRows = rows.map((r) => ({ task_id: r.task_id, label_id: r.label_id, user_id: user.id }));
    const { error } = await supabase.from("task_labels").insert(insertRows);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "task_labels.POST" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");
    if (!taskId) return NextResponse.json({ error: "missing task_id" }, { status: 400 });
    const { error } = await supabase.from("task_labels").delete().eq("task_id", taskId).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "task_labels.DELETE" }, { status: 500 });
  }
}
