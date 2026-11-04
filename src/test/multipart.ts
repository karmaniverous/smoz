/** Test helpers for multipart/form-data requests. */

/** A text field, or a file part (`value` may be raw bytes). */
export type Part =
  | { name: string; value: string }
  | {
      name: string;
      value: string | Buffer;
      filename: string;
      contentType: string;
    };

/** Boundary used by {@link multipartBody}. */
export const boundary = 'smoz-test-boundary';

/** Content-Type header for bodies built by {@link multipartBody}. */
export const multipartContentType = `multipart/form-data; boundary=${boundary}`;

/** Build a multipart/form-data body, as bytes, from text and file parts. */
export const multipartBytes = (parts: Part[]): Buffer =>
  Buffer.concat([
    ...parts.flatMap((p) => {
      const disposition =
        'filename' in p
          ? `form-data; name="${p.name}"; filename="${p.filename}"\r\nContent-Type: ${p.contentType}`
          : `form-data; name="${p.name}"`;
      return [
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: ${disposition}\r\n\r\n`,
        ),
        typeof p.value === 'string' ? Buffer.from(p.value) : p.value,
        Buffer.from('\r\n'),
      ];
    }),
    Buffer.from(`--${boundary}--\r\n`),
  ]);

/** Build a multipart/form-data body, as UTF-8 text, from text and file parts. */
export const multipartBody = (parts: Part[]): string =>
  multipartBytes(parts).toString('utf8');

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
