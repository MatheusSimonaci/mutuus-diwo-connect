import { createClient } from "npm:@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOCODB_BASE_URL = "https://nocodb.diwohub.com";
const PROJECT_ID = "p13zr6gmg9uhscu";
const TABLE_ID = "m8rb3j7y9m5ijxn";
const VIEW_ID = "vwonuwgxqvz1qeyn";
const CUSTOMER_FILTER = "Mutuus";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiToken = Deno.env.get("NOCODB_API_TOKEN")?.trim();
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "Missing NOCODB_API_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const recordId = url.searchParams.get("recordId");
    const pageSize = url.searchParams.get("pageSize") ?? "100";

    const nocoUrl = new URL(`${NOCODB_BASE_URL}/api/v3/data/${PROJECT_ID}/${TABLE_ID}/records`);
    nocoUrl.searchParams.set("pageSize", pageSize);
    nocoUrl.searchParams.set("viewId", VIEW_ID);
    nocoUrl.searchParams.set("where", `(customer,eq,${CUSTOMER_FILTER})`);

    const nocoRes = await fetch(nocoUrl.toString(), {
      method: "GET",
      headers: { "xc-token": apiToken },
    });

    const text = await nocoRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }

    console.log("NocoDB status:", nocoRes.status, "keys:", data && typeof data === "object" ? Object.keys(data) : typeof data);

    if (!nocoRes.ok) {
      return new Response(JSON.stringify({ error: "NocoDB error", status: nocoRes.status, body: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // v3 shape: { records: [{ id, fields: {...} }], next, prev, nestedNext }
    const records: any[] = Array.isArray(data)
      ? data
      : data?.records ?? data?.list ?? [];

    if (recordId) {
      const found = records.find((r: any) => {
        const rid = r?.id ?? r?.Id ?? r?.fields?.id ?? r?.fields?.Id;
        return String(rid) === String(recordId);
      });
      return new Response(JSON.stringify(found ?? null), {
        status: found ? 200 : 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nocodb-records error", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
