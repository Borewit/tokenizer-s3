import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface S3CompatibleObject {
  data: Uint8Array;
  contentType?: string;
  etag?: string;
  versionId?: string;
}

export interface RecordedRequest {
  method: string;
  key: string;
  range?: string;
  versionId?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
}

export interface S3CompatibleServerOptions {
  /** Simulate a provider that ignores the Range header and always returns the full object. */
  ignoreRange?: boolean;
}

/**
 * Minimal S3-compatible HTTP endpoint, implementing the ranged-GET contract the
 * tokenizer and the AWS SDK client rely on. Intended for offline tests only.
 */
export class S3CompatibleServer {
  public readonly requests: RecordedRequest[] = [];
  public readonly bucket = 'test-bucket';

  private readonly objects = new Map<string, S3CompatibleObject>();
  private readonly server: Server = createServer((request, response) => {
    this.handle(request, response);
  });

  public constructor(private readonly options: S3CompatibleServerOptions = {}) {}

  public addObject(key: string, object: S3CompatibleObject): void {
    this.objects.set(key, object);
  }

  public async start(): Promise<string> {
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  public async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      this.server.close(error => (error ? reject(error) : resolve()));
    });
  }

  private handle(request: IncomingMessage, response: ServerResponse): void {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://localhost');
    const key = this.getKey(url.pathname);
    const object = this.objects.get(key);

    this.requests.push({
      method,
      key,
      range: request.headers.range,
      versionId: url.searchParams.get('versionId') ?? undefined,
      ifMatch: request.headers['if-match'] as string | undefined,
      ifNoneMatch: request.headers['if-none-match'] as string | undefined
    });

    if (method !== 'GET' && method !== 'HEAD') {
      this.sendError(response, 405, 'MethodNotAllowed', 'Only GET and HEAD are supported');
      return;
    }

    if (!object) {
      this.sendError(response, 404, 'NoSuchKey', `The specified key does not exist: ${key}`);
      return;
    }

    const versionId = url.searchParams.get('versionId');
    if (versionId !== null && object.versionId !== undefined && versionId !== object.versionId) {
      this.sendError(response, 404, 'NoSuchVersion', `The specified version does not exist: ${versionId}`);
      return;
    }

    const etag = object.etag ?? `"${object.data.length.toString(16)}"`;
    const ifNoneMatch = request.headers['if-none-match'];
    if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
      response.writeHead(304, { ETag: etag });
      response.end();
      return;
    }

    const ifMatch = request.headers['if-match'];
    if (typeof ifMatch === 'string' && ifMatch !== etag) {
      this.sendError(response, 412, 'PreconditionFailed', 'At least one of the preconditions failed');
      return;
    }

    const totalSize = object.data.length;
    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Type': object.contentType ?? 'application/octet-stream',
      ETag: etag
    };
    if (object.versionId !== undefined) {
      headers['x-amz-version-id'] = object.versionId;
    }

    const range = this.options.ignoreRange ? undefined : request.headers.range;
    if (range === undefined) {
      response.writeHead(200, { ...headers, 'Content-Length': String(totalSize) });
      response.end(method === 'HEAD' ? undefined : Buffer.from(object.data));
      return;
    }

    const parsed = parseRange(range, totalSize);
    if (parsed === undefined) {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${totalSize}` });
      response.end();
      return;
    }

    const [first, last] = parsed;
    response.writeHead(206, {
      ...headers,
      'Content-Length': String(last - first + 1),
      'Content-Range': `bytes ${first}-${last}/${totalSize}`
    });
    response.end(method === 'HEAD' ? undefined : Buffer.from(object.data.subarray(first, last + 1)));
  }

  private getKey(pathname: string): string {
    const prefix = `/${this.bucket}/`;
    const key = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(1);
    return decodeURIComponent(key);
  }

  private sendError(response: ServerResponse, status: number, code: string, message: string): void {
    const body = `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`;
    response.writeHead(status, {
      'Content-Type': 'application/xml',
      'Content-Length': String(Buffer.byteLength(body))
    });
    response.end(body);
  }
}

function parseRange(range: string, totalSize: number): [number, number] | undefined {
  const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
  if (!match) {
    return undefined;
  }
  if (totalSize === 0) {
    return undefined;
  }
  const first = Number.parseInt(match[1], 10);
  const last = match[2] === '' ? totalSize - 1 : Math.min(Number.parseInt(match[2], 10), totalSize - 1);
  if (first > last || first >= totalSize) {
    return undefined;
  }
  return [first, last];
}
