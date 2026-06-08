export interface BookRequestDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  land: string;
  street: string;
  plz: string;
  city: string;
  books: string[];
  wish: string | null;
  language: string;
  requestedAt: string;
}
