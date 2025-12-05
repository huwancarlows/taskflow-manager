export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, due_date, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ tasks: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "tasks.GET" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body || !body.title || !body.status) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const payload = {
      id: body.id,
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      due_date: body.dueDate ?? null,
      created_at: body.createdAt,
      updated_at: body.updatedAt,
      user_id: user.id,
    };
    const { error } = await supabase.from("tasks").insert(payload);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "tasks.POST" }, { status: 500 });
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
    if (body?.title !== undefined) updates.title = body.title;
    if (body?.description !== undefined) updates.description = body.description ?? null;
    if (body?.status !== undefined) updates.status = body.status;
    if (body?.dueDate !== undefined) updates.due_date = body.dueDate ?? null;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    const { error } = await supabase.from("tasks").update(updates).eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "tasks.PUT" }, { status: 500 });
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
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message, hint: "tasks.DELETE" }, { status: 500 });
  }
}
