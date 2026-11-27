/** AI drafts save their reasoning as a note starting "AI draft." for Adam to read. Clients never see it until Adam rewrites the note. */
export function clientNote(note: string | null | undefined) {
  return note && !note.startsWith("AI draft.") ? note : null;
}
