import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const NOCODB_BASE = "https://nocodb.diwohub.com/api/v3/data/p13zr6gmg9uhscu/m8rb3j7y9m5ijxn/records";
const VIEW_ID = "vwonuwgxqvz1qeyn";
const CUSTOMER_FILTER = "Mutuus";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiToken = Deno.env.get("NOCODB_API_TOKEN");
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "Missing NOCODB_API_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const recordId = url.searchParams.get("recordId");
    const pageSize = url.searchParams.get("pageSize") ?? "100";

    // Single record fetch
    if (recordId) {
      const r = await fetch(`${NOCODB_BASE}/${encodeURIComponent(recordId)}`, {
        headers: { "xc-token": apiToken },
      });
      const body = await r.text();
      return new Response(body, {
        status: r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List records (filtered by customer = Mutuus)
    const params = new URLSearchParams({
      pageSize,
      viewId: VIEW_ID,
      where: `(customer,eq,${CUSTOMER_FILTER})`,
    });

    const r = await fetch(`${NOCODB_BASE}?${params.toString()}`, {
      headers: { "xc-token": apiToken },
    });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nocodb-records error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
