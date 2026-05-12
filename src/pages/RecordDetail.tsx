import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Zap, Loader2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const formatValue = (v: any): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
};

const isLongText = (v: any) =>
  typeof v === "string" && (v.length > 80 || v.includes("\n"));

const HIDDEN_FIELDS = new Set([
  "customer", "instance_name", "subscriptionid", "lat_long", "category",
  "other_filter", "test_mode", "pitch", "zap_farm_id", "chatbotid",
  "snovio_list", "snovio_campaign", "test_mode_phone", "warmup",
  "capture_email", "istrash", "geo_filter", "prompt_token_count",
  "aiprovider", "ai_link", "is_make_active", "agent_context",
]);

// Fields that should not be editable even when visible
const READONLY_FIELDS = new Set([
  "id", "Id", "scenario_id", "created_at", "updated_at", "createdAt", "updatedAt",
  "CreatedAt", "UpdatedAt",
]);

const RecordDetail = () => {
  const { id } = useParams();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});

  const handleActivate = async () => {
    const f = record?.fields ?? record ?? {};
    const scenarioId = f.scenario_id ?? f.scenarioId ?? f.ScenarioId ?? id;
    setActivating(true);
    try {
      const res = await fetch("https://diwo-n8n-prod-2.up.railway.app/webhook/google-maps+list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: String(scenarioId), createdAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Ativação iniciada com sucesso");
    } catch (e: any) {
      toast.error("Erro ao ativar", { description: e?.message });
    } finally {
      setActivating(false);
    }
  };

  const loadRecord = async () => {
    if (!id) return;
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
  };

  useEffect(() => {
    document.title = `Registro ${id} | Diwo & Mutuus`;
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rawFields: Array<[string, any]> = useMemo(() => (
    record?.fields && typeof record.fields === "object"
      ? Object.entries(record.fields)
      : record && typeof record === "object"
      ? Object.entries(record).filter(([k]) => k !== "fields")
      : []
  ), [record]);

  const fields = rawFields.filter(([k]) => !HIDDEN_FIELDS.has(k));

  const startEdit = () => {
    const initial: Record<string, any> = {};
    for (const [k, v] of fields) {
      if (READONLY_FIELDS.has(k)) continue;
      initial[k] = v;
    }
    setDraft(initial);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft({});
    setEditing(false);
  };

  const updateDraft = (key: string, value: any) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const recordIdValue = record?.id ?? record?.Id ?? record?.fields?.id ?? record?.fields?.Id ?? id;
  const scenarioIdValue = record?.fields?.scenario_id ?? record?.scenario_id ?? record?.fields?.scenarioId ?? record?.scenarioId;

  const saveEdit = async () => {
    // Only send changed fields
    const original = Object.fromEntries(fields);
    const changed: Record<string, any> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (JSON.stringify(v) !== JSON.stringify(original[k])) {
        changed[k] = v;
      }
    }
    if (Object.keys(changed).length === 0) {
      toast.info("Nenhuma alteração para salvar");
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (!scenarioIdValue) throw new Error("scenario_id não encontrado no registro");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nocodb-records`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ scenario_id: String(scenarioIdValue), fields: changed }),
      });
      const text = await res.text();
      let data: any; try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data) : text);
      toast.success("Registro atualizado");
      setEditing(false);
      setDraft({});
      await loadRecord();
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = (key: string, value: any) => {
    const current = draft[key];
    if (typeof value === "boolean" || typeof current === "boolean") {
      return (
        <Switch
          checked={Boolean(current)}
          onCheckedChange={(v) => updateDraft(key, v)}
        />
      );
    }
    if (typeof value === "number") {
      return (
        <Input
          type="number"
          value={current ?? ""}
          onChange={(e) => updateDraft(key, e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    }
    if (isLongText(value) || (typeof current === "string" && current.length > 80)) {
      return (
        <Textarea
          rows={Math.min(12, Math.max(3, String(current ?? "").split("\n").length + 1))}
          value={current ?? ""}
          onChange={(e) => updateDraft(key, e.target.value)}
        />
      );
    }
    if (value && typeof value === "object") {
      return (
        <Textarea
          rows={6}
          value={typeof current === "string" ? current : JSON.stringify(current ?? value, null, 2)}
          onChange={(e) => {
            try { updateDraft(key, JSON.parse(e.target.value)); }
            catch { updateDraft(key, e.target.value); }
          }}
        />
      );
    }
    return (
      <Input
        value={current ?? ""}
        onChange={(e) => updateDraft(key, e.target.value)}
      />
    );
  };

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
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="secondary" className="mb-3">Customer · Mutuus</Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Detalhes do registro
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  ID: <span className="font-mono">{String(id)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                    <Button onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={startEdit}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button variant="gold" size="lg" onClick={handleActivate} disabled={activating}>
                      {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Ativar agora
                    </Button>
                  </>
                )}
              </div>
            </div>
            <Card className="divide-y divide-border overflow-hidden shadow-card-soft">
              {fields.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Sem campos para exibir.</div>
              ) : (
                fields.map(([key, value]) => {
                  const readOnly = READONLY_FIELDS.has(key);
                  return (
                    <div
                      key={key}
                      className="grid gap-2 p-5 transition-smooth hover:bg-muted/40 md:grid-cols-[240px_1fr] md:gap-6"
                    >
                      <div className="text-sm font-medium text-muted-foreground">
                        {key}
                        {editing && readOnly && (
                          <span className="ml-2 text-xs opacity-60">(somente leitura)</span>
                        )}
                      </div>
                      {editing && !readOnly ? (
                        <div>{renderEditor(key, value)}</div>
                      ) : isLongText(value) ? (
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                          {formatValue(value)}
                        </pre>
                      ) : (
                        <div className="break-words text-sm text-foreground">{formatValue(value)}</div>
                      )}
                    </div>
                  );
                })
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default RecordDetail;
