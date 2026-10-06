export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  id: string;
  [key: string]: string;
}