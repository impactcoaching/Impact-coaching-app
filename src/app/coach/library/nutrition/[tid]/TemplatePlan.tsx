"use client";

import { saveTemplateNutrition } from "@/app/actions/templates";
import { PlanBuilder } from "@/app/coach/clients/[id]/nutrition/PlanBuilder";
import type { DayType, Food, Style } from "@/lib/nutrition";

/** A nutrition template, in the same builder as a client's plan. */
export function TemplatePlan({ templateId, style, notes, days, foods }: { templateId: string; style: Style; notes: string | null; days: DayType[]; foods: Food[] }) {
  return (
    <PlanBuilder
      initialStyle={style}
      initialNotes={notes}
      initialDays={days}
      foods={foods}
      clientFirst="the client"
      country={null}
      kj={false}
      onSave={(plan) => saveTemplateNutrition({ templateId, ...plan })}
    />
  );
}
