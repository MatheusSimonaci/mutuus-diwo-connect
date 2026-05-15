import { CreditCard, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const fmtInt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
const fmtDec = (n: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const ConsumptionCard = () => {
  const [data, setData] = useState<{ credits: number; consumption: number; balance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: res, error } = await supabase.functions.invoke("diwo-credits", { method: "GET" });
      if (!error && res) {
        setData({
          credits: Number(res.credits ?? 0),
          consumption: Number(res.consumption ?? 0),
          balance: Number(res.balance ?? 0),
        });
      }
      setLoading(false);
    })();
  }, []);

  const pct = data && data.credits > 0
    ? Math.min(100, Math.max(0, (data.consumption / data.credits) * 100))
    : 0;

  return (
    <Card className="mb-6 overflow-hidden p-0 shadow-card-soft">
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="text-base font-semibold text-foreground">Detalhamento de Consumo</h2>
      </div>
      <Progress value={pct} className="h-1 rounded-none" />
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Créditos:</span>
          <span className="font-semibold text-foreground">
            {loading || !data ? "—" : fmtInt(data.credits)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm sm:justify-center">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Consumo:</span>
          <span className="font-semibold text-foreground">
            {loading || !data ? "—" : fmtDec(data.consumption)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm sm:justify-end">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Saldo:</span>
          <span className={`font-semibold ${data && data.balance < 0 ? "text-destructive" : "text-foreground"}`}>
            {loading || !data ? "—" : fmtDec(data.balance)}
          </span>
        </div>
      </div>
    </Card>
  );
};
