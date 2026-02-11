declare module "jszip" {
  export class JSZip {
    files: Record<string, JSZip.File>;
    folder(name: string): JSZip;
    file(name: string, content: string | Uint8Array | Blob | ArrayBuffer): JSZip.File;
    generateAsync(options?: any): Promise<Blob>;
  }
  export default JSZip;
}