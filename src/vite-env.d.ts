/// <reference types="vite/client" />

declare module 'file-saver' {
  function saveAs(data: Blob | string, filename?: string, options?: any): void;
  export default saveAs;
}

declare module 'jszip' {
  const JSZip: any;
  export default JSZip;
}
