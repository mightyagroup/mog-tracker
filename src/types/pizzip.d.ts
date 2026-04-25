// Minimal type shim for pizzip 3.x — npm package ships no .d.ts.
// We only use the subset needed by src/lib/bid-templates/generator.ts.
declare module 'pizzip' {
  interface PizZipFile {
    name: string
    asText(): string
    asBinary(): string
    asUint8Array(): Uint8Array
    asNodeBuffer(): Buffer
  }

  type PizZipFiles = Record<string, PizZipFile>

  interface PizZipGenerateOptions {
    type?: 'string' | 'base64' | 'binarystring' | 'uint8array' | 'arraybuffer' | 'blob' | 'nodebuffer'
    compression?: 'STORE' | 'DEFLATE'
    compressionOptions?: { level?: number }
    mimeType?: string
    encodeFileName?: (name: string) => string
  }

  interface PizZipLoadOptions {
    base64?: boolean
    checkCRC32?: boolean
    optimizedBinaryString?: boolean
    createFolders?: boolean
  }

  interface PizZipFolder {
    file(name: string): PizZipFile | null
    file(name: string, content: string | Uint8Array | Buffer | ArrayBuffer | Blob): PizZipInstance
    folder(name: string): PizZipFolder
    remove(name: string): PizZipInstance
  }

  interface PizZipInstance extends PizZipFolder {
    files: PizZipFiles
    load(data: string | Uint8Array | Buffer | ArrayBuffer, opts?: PizZipLoadOptions): PizZipInstance
    generate(opts?: PizZipGenerateOptions): string | Uint8Array | Buffer | ArrayBuffer | Blob
    filter(predicate: (relativePath: string, file: PizZipFile) => boolean): PizZipFile[]
  }

  interface PizZipConstructor {
    new (data?: string | Uint8Array | Buffer | ArrayBuffer, opts?: PizZipLoadOptions): PizZipInstance
    (data?: string | Uint8Array | Buffer | ArrayBuffer, opts?: PizZipLoadOptions): PizZipInstance
  }

  const PizZip: PizZipConstructor
  export default PizZip
}
