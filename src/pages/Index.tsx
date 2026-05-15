import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ConsumptionCard } from "@/components/ConsumptionCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";



const getId = (r: any) => r?.id ?? r?.Id ?? r?.fields?.id ?? r?.fields?.Id;
const getTitle = (r: any) => {
  const f = r?.fields ?? r;
  return f.scenario_name ?? f.title ?? f.Title ?? f.name ?? f.Name ?? f.project ?? f.Project ?? `Registro ${getId(r)}`;
};
const isTrash = (r: any) => {
  const f = r?.fields ?? r;
  const v = f.istrash ?? f.isTrash ?? f.IsTrash;
  return v === true || v === 1 || v === "true" || v === "1";
};
const isDisconnected = (r: any) => {
  const f = r?.fields ?? r;
  const v = (f.instance_name ?? f.instanceName ?? "").toString().trim().toLowerCase();
  return v === "sem instância" || v === "sem instancia";
};
const getSubtitle = (r: any) => {
  const f = r?.fields ?? r;
  return f.status ?? f.Status ?? f.stage ?? f.Stage ?? f.customer ?? f.Customer ?? null;
};

const Index = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Registros Mutuus | Diwo & Mutuus";
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("nocodb-records", { method: "GET" });
      if (error) {
        toast.error("Erro ao buscar registros");
        console.error(error);
      } else {
        const list = data?.records ?? data?.list ?? data?.data ?? data ?? [];
        setRecords(Array.isArray(list) ? list : []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let visible = records.filter((r) => !isTrash(r));
    if (q.trim()) {
      const term = q.toLowerCase();
      visible = visible.filter((r) => JSON.stringify(r).toLowerCase().includes(term));
    }
    return [...visible].sort(
      (a, b) => Number(isDisconnected(a)) - Number(isDisconnected(b)),
    );
  }, [q, records]);

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10">
        <ConsumptionCard />
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">Customer · Mutuus</Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Registros</h1>
            <p className="mt-2 text-muted-foreground">
              Visualize todos os registros vinculados ao cliente Mutuus.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum registro encontrado.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => {
              const id = getId(r);
              const title = getTitle(r);
              const subtitle = getSubtitle(r);
              return (
                <Link key={id ?? i} to={`/records/${encodeURIComponent(String(id))}`}>
                  <Card className="group h-full p-5 shadow-card-soft transition-smooth hover:-translate-y-0.5 hover:shadow-elegant">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wider text-accent">
                          #{String(id ?? i + 1)}
                        </div>
                        <h3 className="mt-1 truncate text-lg font-semibold text-foreground">
                          {String(title)}
                        </h3>
                        {subtitle && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">{String(subtitle)}</p>
                        )}
                        {isDisconnected(r) && (
                          <Badge variant="destructive" className="mt-2">desconectado</Badge>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-smooth group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
