"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Minus, Plus } from "lucide-react";

interface BudgetRuleEditorProps {
  initialRule: { necesidades: number; deseos: number; ahorro: number };
  ingresosQuincena: number;
  onChange: (rule: { necesidades: number; deseos: number; ahorro: number }) => void;
  onSave?: () => void;
}

const GRUPOS = [
  { id: "necesidades", label: "Necesidades", color: "#3B82F6", icon: "Umbrella" },
  { id: "deseos", label: "Deseos", color: "#F59E0B", icon: "Wallet" },
  { id: "ahorro", label: "Ahorro", color: "#06D6A0", icon: "PiggyBank" },
] as const;

type Grupo = (typeof GRUPOS)[number]["id"];

export function BudgetRuleEditor({ initialRule, ingresosQuincena, onChange, onSave }: BudgetRuleEditorProps) {
  const [rule, setRule] = useState<Record<Grupo, number>>({
    necesidades: initialRule.necesidades,
    deseos: initialRule.deseos,
    ahorro: initialRule.ahorro,
  });
  const [errors, setErrors] = useState<Partial<Record<Grupo, string>>>({});
  const [pendingAdjustment, setPendingAdjustment] = useState<{ from: Grupo; to: Grupo[]; amount: number } | null>(null);

  const suma = useMemo(() => rule.necesidades + rule.deseos + rule.ahorro, [rule]);
  const isValid = suma === 100;
  const isOver = suma > 100;
  const isUnder = suma < 100 && suma > 0;

  useEffect(() => {
    onChange(rule);
  }, [rule, onChange]);

  const handleChange = useCallback((grupo: Grupo, value: string) => {
    const num = Math.max(0, Math.min(100, parseInt(value) || 0));
    const oldValue = rule[grupo];
    const diff = num - oldValue;

    if (diff === 0) return;

    const newRule = { ...rule, [grupo]: num };
    const newSuma = newRule.necesidades + newRule.deseos + newRule.ahorro;

    if (newSuma <= 100) {
      setRule(newRule);
      setPendingAdjustment(null);
      return;
    }

    const otherGrupos: Grupo[] = GRUPOS.map((g) => g.id).filter((g) => g !== grupo);
    const otherSum = otherGrupos.reduce((s, g) => s + newRule[g], 0);
    const excess = newSuma - 100;

    if (otherSum >= excess) {
      const proportional = otherGrupos.map((g) => ({
        grupo: g,
        reduction: Math.round((newRule[g] / otherSum) * excess),
      }));
      let remaining = excess;
      const adjusted = proportional.map((p, i) => {
        const reduction = i === proportional.length - 1 ? remaining : p.reduction;
        remaining -= reduction;
        return { grupo: p.grupo, newValue: Math.max(0, newRule[p.grupo] - reduction) };
      });
      const finalRule = { ...newRule };
      for (const a of adjusted) {
        finalRule[a.grupo] = a.newValue;
      }
      setRule(finalRule);
      setPendingAdjustment(null);
    } else {
      setRule(newRule);
      setPendingAdjustment({ from: grupo, to: otherGrupos, amount: excess });
    }
  }, [rule]);

  const applyAutoAdjust = useCallback(() => {
    if (!pendingAdjustment) return;
    const { from, to, amount } = pendingAdjustment;
    const newRule = { ...rule };
    const toSum = to.reduce((s, g) => s + newRule[g], 0);
    for (const g of to) {
      const reduction = toSum > 0 ? Math.round((newRule[g] / toSum) * amount) : Math.round(amount / to.length);
      newRule[g] = Math.max(0, newRule[g] - reduction);
    }
    setRule(newRule);
    setPendingAdjustment(null);
  }, [pendingAdjustment, rule]);

  const ruleTitle = useMemo(() => `${rule.necesidades}/${rule.deseos}/${rule.ahorro}`, [rule]);

  const Icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Umbrella: () => <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v10"/><path d="M8 12h8"/><path d="M8 12a4 4 0 0 1 0-8h8a4 4 0 0 1 0 8"/></svg>,
    Wallet: () => <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><path d="M3 5v14a2 2 0 0 0 2 2h14v-9"/></svg>,
    PiggyBank: () => <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V10a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v11"/><path d="M2 10h20"/><path d="M7 10v11"/><path d="M17 10v11"/><path d="M12 4h.01"/></svg>,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-lg">Regla del presupuesto</h3>
        <div className={cn("font-mono text-xl font-bold px-3 py-1 rounded-lg", isValid ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive")}>
          {ruleTitle}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {GRUPOS.map((g) => (
          <div key={g.id} className="space-y-2 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {(() => {
                const Icon = Icons[g.icon];
                return (
                  <span style={{ color: g.color }} className="inline-flex">
                    <Icon />
                  </span>
                );
              })()}
              {g.label}
            </div>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={rule[g.id]}
                onChange={(e) => handleChange(g.id, e.target.value)}
                className={cn(
                  "h-12 text-center text-2xl font-bold font-mono",
                  "border-2 rounded-xl",
                  errors[g.id] ? "border-destructive" : isValid ? "border-positive" : "border-border"
                )}
                inputMode="numeric"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium">%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>≈ {formatCurrency((ingresosQuincena * rule[g.id]) / 100)}</span>
              {errors[g.id] && <span className="text-destructive">{errors[g.id]}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className={cn("rounded-lg p-3 text-sm", isValid ? "bg-positive/10 text-positive" : isOver ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle className="size-4" />
          ) : isOver ? (
            <AlertCircle className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          <span>
            {isValid
              ? "Suma 100% ✓"
              : isOver
              ? `Suma ${suma}% — te pasaste por ${suma - 100}%`
              : `Suma ${suma}% — faltan ${100 - suma}%`}
          </span>
        </div>
        {pendingAdjustment && (
          <Button variant="outline" size="sm" className="mt-2" onClick={applyAutoAdjust}>
            Ajustar automáticamente (restar {pendingAdjustment.amount}% de los otros)
          </Button>
        )}
      </div>

      {onSave && (
        <Button className={cn("w-full", isValid ? "btn-gradient" : "opacity-50 cursor-not-allowed")} onClick={onSave} disabled={!isValid}>
          Guardar regla
        </Button>
      )}
    </div>
  );
}