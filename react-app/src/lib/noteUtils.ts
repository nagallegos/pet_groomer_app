import type { NoteItem } from "../types/models";

export function getNotePostedByLabel(note: Pick<NoteItem, "createdByName">) {
  if (!note.createdByName?.trim()) {
    return null;
  }

  return `Posted by ${note.createdByName}`;
}
