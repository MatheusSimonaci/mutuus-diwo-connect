import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const formatValue = (v: any): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
};

const isLongText = (v: any) =>
  typeof v === "string" && (v.length > 80 || v.includes("\n"));

const RecordDetail = () => {
  const { id } = useParams();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Registro ${id} | Diwo & Mutuus`;
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke(
        `nocodb-records?recordId=${encodeURIComponent(id)}`,
        { method: "GET" },
      );
      if (error) {
        toast.error("Erro ao buscar registro");
        console.error(error);
      } else {
        setRecord(data?.record ?? data?.fields ?? data);
      }
      setLoading(false);
    })();
  }, [id]);

  const HIDDEN_FIELDS = new Set([
    "customer", "instance_name", "subscriptionid", "lat_long", "category",
    "other_filter", "test_mode", "pitch", "zap_farm_id", "chatbotid",
    "snovio_list", "snovio_campaign", "test_mode_phone", "warmup",
    "capture_email", "istrash", "geo_filter", "prompt_token_count",
    "aiprovider", "ai_link", "is_make_active", "agent_context",
  ]);
  const rawFields: Array<[string, any]> =
    record?.fields && typeof record.fields === "object"
      ? Object.entries(record.fields)
      : record && typeof record === "object"
      ? Object.entries(record).filter(([k]) => k !== "fields")
      : [];
  const fields = rawFields.filter(([k]) => !HIDDEN_FIELDS.has(k));

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>

        {loading ? (
          <Card className="h-96 animate-pulse bg-muted/40" />
        ) : !record ? (
          <Card className="p-10 text-center text-muted-foreground">Registro não encontrado.</Card>
        ) : (
          <>
            <div className="mb-8">
              <Badge variant="secondary" className="mb-3">Customer · Mutuus</Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Detalhes do registro
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                ID: <span className="font-mono">{String(id)}</span>
              </p>
            </div>
            <Card className="divide-y divide-border overflow-hidden shadow-card-soft">
              {fields.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Sem campos para exibir.</div>
              ) : (
                fields.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid gap-2 p-5 transition-smooth hover:bg-muted/40 md:grid-cols-[240px_1fr] md:gap-6"
                  >
                    <div className="text-sm font-medium text-muted-foreground">{key}</div>
                    {isLongText(value) ? (
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                        {formatValue(value)}
                      </pre>
                    ) : (
                      <div className="break-words text-sm text-foreground">{formatValue(value)}</div>
                    )}
                  </div>
                ))
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default RecordDetail;
