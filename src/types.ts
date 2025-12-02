export type Status = "backlog" | "in_progress" | "done";

export type LabelColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  labels: string[]; // array of label ids
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Filters {
  query: string;
  when: "all" | "today" | "upcoming";
  labelIds: string[];
}

export interface BoardState {
  tasks: Task[];
  labels: Label[];
}

export const DEFAULT_LABELS: Label[] = [
  { id: "lbl-red", name: "Urgent", color: "red" },
  { id: "lbl-blue", name: "Info", color: "blue" },
  { id: "lbl-green", name: "Feature", color: "green" },
  { id: "lbl-amber", name: "Chore", color: "amber" },
];

export const STATUS_ORDER: Status[] = ["backlog", "in_progress", "done"];

export const STATUS_TITLES: Record<Status, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  done: "Done",
};
