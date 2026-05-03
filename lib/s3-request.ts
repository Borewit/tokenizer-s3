import { type IRangeRequestClient, type IRangeRequestResponse, parseContentRange } from '@tokenizer/range';
import { type GetObjectRequest, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

type ByteRangeRequest = [number, number];

export interface S3RequestResponse {
  ContentType?: string;
  ContentRange?: string;
  Body?: unknown;
}

export interface S3RequestClient {
  send(command: GetObjectCommand, options?: { abortSignal?: AbortSignal }): Promise<S3RequestResponse>;
}

/**
 * Use S3-client to execute actual HTTP-requests.
 */
export class S3Request implements IRangeRequestClient {

  private readonly abortController = new AbortController();

  constructor(private s3: S3RequestClient, private objRequest: GetObjectRequest) {
  }

  /**
   * Concatenate given array of Uint8Arrays
   * @param arrays Array of Uint8Arrays
   */
  private static mergeUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
    const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
    const merged = new Uint8Array(totalSize);

    arrays.forEach((array, i, arrays) => {
      const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
      merged.set(array, offset);
    });

    return merged;
  }

  public async buildArrayBuffer(response: S3RequestResponse): Promise<Uint8Array> {
    const buffers: Uint8Array[] = [];
    if (response.Body instanceof Readable) {
      for await (const chunk of response.Body) {
        buffers.push(chunk);
      }
      return S3Request.mergeUint8Arrays(...buffers);
    }
      throw new Error('body expected to be an instance of Readable ');
  }

  public async getResponse(_method: string | undefined, range: ByteRangeRequest): Promise<IRangeRequestResponse> {

    const response = await this.getRangedRequest(range);
    const contentRange = parseContentRange(response.ContentRange as string);

    return {
      size: contentRange?.instanceLength as number,
      mimeType: response.ContentType,
      contentRange,
      acceptPartialRequests: true,
      arrayBuffer: () => this.buildArrayBuffer(response),
    };
  }

  /**
   * Do a ranged request
   * @param range Range request
   */
  public getRangedRequest(range: ByteRangeRequest) {
    const rangedRequest: GetObjectRequest = {
      ...this.objRequest,
      Range: `bytes=${range[0]}-${range[1]}`,
    };
    const command = new GetObjectCommand(rangedRequest)

    return this.s3.send(command, { abortSignal: this.abortController.signal });
  }

  abort(): void {
    this.abortController.abort();
  }
}
