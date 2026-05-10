export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'pdf-page';
  thumbnail: string; // data URL
  data: ArrayBuffer; // original file data
  width: number;
  height: number;
  pageNumber?: number; // for multi-page PDFs
  sourceFile?: string; // original filename for PDF pages
}

export interface Page {
  id: string; // "page-<uuid>" prefix to disambiguate from item IDs
  items: FileItem[];
}
