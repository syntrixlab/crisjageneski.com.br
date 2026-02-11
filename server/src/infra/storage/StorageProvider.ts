export type UploadResult = {
  url: string;
  path: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
};

export type UploadOptions = {
  cacheControl?: string;
  convertToWebp?: boolean;
  maxWidth?: number;
  maxHeight?: number;
};

export interface StorageProvider {
  uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): Promise<string>;
  createSignedUrl(path: string, expiresIn: number): Promise<string>;
}
