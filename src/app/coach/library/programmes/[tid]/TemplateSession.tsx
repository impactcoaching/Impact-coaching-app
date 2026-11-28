"use client";

import { saveTemplateSession, setTemplateSessionDays } from "@/app/actions/templates";
import type { Exercise, PlanExercise } from "@/lib/training";
import { Builder } from "@/app/coach/clients/[id]/training/Builder";
import { WorkoutDays } from "@/app/coach/clients/[id]/training/WorkoutDays";

/** One session of a programme template: its days and its exercises, in the same builder as a client's. */
export function TemplateSession({
  templateId,
  index,
  name,
  weekdays,
  exercises,
  library,
}: {
  templateId: string;
  index: number;
  name: string;
  weekdays: number[];
  exercises: PlanExercise[];
  library: Exercise[];
}) {
  return (
    <>
      <div className="card">
        <WorkoutDays initial={weekdays} first="the client" onSave={(days) => setTemplateSessionDays(templateId, index, days)} />
      </div>
      <Builder
        workoutName={name}
        initial={exercises}
        library={library}
        gymName={null}
        gymKit={null}
        clientFirst="the client"
        onSave={(n, list) => saveTemplateSession({ templateId, index, name: n, exercises: list })}
      />
    </>
  );
}
