export interface Book {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  book_id: number;
  branch_id: number;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  fine: number;
  estimated_fine: number;
}

export interface Branch {
  id: number;
  location: string;
}

export interface Reservation {
  id: number;
  book_id: number;
  branch_id: number;
  reserved_at: string;
  status: string;
  rank: number; // This matches the "position" logic we built
}