import { createClient } from "https://esm.sh/@supabase/supabase-js";

// إنشاء عميل Supabase باستخدام SERVICE_ROLE_KEY
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ضع هنا رابط موقعك النهائي بعد رفعه
const FRONTEND_URL = "https://manteka-alex-ebiw.vercel.app";

Deno.serve(async (req) => {
  // 1️⃣ التعامل مع طلبات Preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": FRONTEND_URL,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
      },
    });
  }

  // 2️⃣ التأكد من أن الطلب POST فقط
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, password, full_name, organization_id } = await req.json();

    if (!email || !password || !full_name || !organization_id) {
      return new Response("بيانات ناقصة", { status: 400 });
    }

    // 3️⃣ إنشاء المستخدم في Auth باستخدام SERVICE_ROLE_KEY
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) throw userError;

    // 4️⃣ إنشاء profile في جدول profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userData.user.id,
        full_name,
        role: "coach",
        organization_id,
      });

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": FRONTEND_URL,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": FRONTEND_URL,
        "Content-Type": "application/json",
      },
    });
  }
});
