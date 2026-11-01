import { Readable } from 'node:stream';
import type { GetObjectCommand, GetObjectRequest } from '@aws-sdk/client-s3';
import type { S3RequestClient, S3RequestResponse } from '../lib/s3-request.js';

export interface FakeS3Object {
  data: Uint8Array;
  contentType?: string;
}

/**
 * In-memory S3 client implementing the structural `S3RequestClient` interface.
 * Mirrors the ranged GET behaviour the tokenizer relies on.
 */
export class FakeS3Client implements S3RequestClient {
  public readonly requests: GetObjectRequest[] = [];
  public readonly abortedSignals: boolean[] = [];

  public constructor(private readonly objects: Record<string, FakeS3Object>) {}

  public async send(command: GetObjectCommand, options?: { abortSignal?: AbortSignal }): Promise<S3RequestResponse> {
    const request = command.input;
    this.requests.push({ ...request });
    this.abortedSignals.push(options?.abortSignal?.aborted ?? false);

    if (options?.abortSignal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    const object = this.objects[request.Key ?? ''];
    if (!object) {
      throw new Error(`NoSuchKey: ${request.Key}`);
    }

    const totalSize = object.data.length;
    const range = parseRange(request.Range, totalSize);

    if (range === undefined) {
      return {
        ContentType: object.contentType,
        Body: Readable.from([object.data], { objectMode: false })
      };
    }

    const [first, last] = range;
    return {
      ContentType: object.contentType,
      ContentRange: `bytes ${first}-${last}/${totalSize}`,
      Body: Readable.from([object.data.subarray(first, last + 1)], { objectMode: false })
    };
  }
}

function parseRange(rangeHeader: string | undefined, totalSize: number): [number, number] | undefined {
  if (rangeHeader === undefined) {
    return undefined;
  }
  const match = /^bytes=(\d+)-(\d+)$/.exec(rangeHeader);
  if (!match) {
    throw new Error(`Unsupported range: ${rangeHeader}`);
  }
  const first = Number.parseInt(match[1], 10);
  const last = Math.min(Number.parseInt(match[2], 10), totalSize - 1);
  if (first > last) {
    throw new Error(`Unsatisfiable range: ${rangeHeader}`);
  }
  return [first, last];
}

export function createPatternData(size: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = i % 251;
  }
  return data;
}
