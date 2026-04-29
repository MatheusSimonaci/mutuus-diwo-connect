import { Api } from "npm:nocodb-sdk@0.301.3";
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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
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

    const api = new Api({
      baseURL: NOCODB_BASE_URL,
      headers: {
        "xc-token": apiToken,
      },
    });

    const data = await api.dbDataTableRow.list(PROJECT_ID, TABLE_ID, {
      pageSize: Number(pageSize),
      viewId: VIEW_ID,
      where: `(customer,eq,${CUSTOMER_FILTER})`,
    });

    const records = Array.isArray(data) ? data : data?.list ?? [];
    const responseBody = recordId
      ? records.find((record: Record<string, unknown>) => String(record.Id ?? record.id) === recordId) ?? null
      : data;

    return new Response(JSON.stringify(responseBody), {
      status: recordId && !responseBody ? 404 : 200,
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
