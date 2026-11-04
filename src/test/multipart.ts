/** Test helpers for multipart/form-data requests. */

export type Part =
  | { name: string; value: string }
  | { name: string; value: string; filename: string; contentType: string };

/** Boundary used by {@link multipartBody}. */
export const boundary = 'smoz-test-boundary';

/** Content-Type header for bodies built by {@link multipartBody}. */
export const multipartContentType = `multipart/form-data; boundary=${boundary}`;

/** Build a multipart/form-data body from text and file parts. */
export const multipartBody = (parts: Part[]): string =>
  parts
    .map((p) => {
      const disposition =
        'filename' in p
          ? `form-data; name="${p.name}"; filename="${p.filename}"\r\nContent-Type: ${p.contentType}`
          : `form-data; name="${p.name}"`;
      return `--${boundary}\r\nContent-Disposition: ${disposition}\r\n\r\n${p.value}\r\n`;
    })
    .join('') + `--${boundary}--\r\n`;

/** A text field and a file field. */
export const formParts: Part[] = [
  { name: 'name', value: 'Aris' },
  {
    name: 'logo',
    value: 'PNGDATA',
    filename: 'logo.png',
    contentType: 'image/png',
  },
];
