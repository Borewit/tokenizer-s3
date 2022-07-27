import { IRangeRequestClient, IRangeRequestResponse, parseContentRange } from '@tokenizer/range';
import { S3Client, GetObjectRequest, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * Use S3-client to execute actual HTTP-requests.
 */
export class S3Request implements IRangeRequestClient {

  constructor(private s3: S3Client, private objRequest: GetObjectRequest) {
  }

  public buildArrayBuffer(body): () => Promise<Buffer> {
    return async () => {
      const buffer = [];
      if (body instanceof Readable) {
        for await (const chunk of body) {
          buffer.push(chunk);
        }
        return Buffer.concat(buffer);
      } else {
        throw new Error('Runtime not supported');
      }
    }
  }

  public async getResponse(method, range: number[]): Promise<IRangeRequestResponse> {

    const response = await this.getRangedRequest(range);

    const { Body: body, ContentType: mimeType } = response;

    const contentRange = parseContentRange(response.ContentRange);

    return {
      size: contentRange?.instanceLength,
      mimeType,
      contentRange,
      arrayBuffer: this.buildArrayBuffer(body),
    };
  }

  /**
   * Do a ranged request
   * @param objRequest S3 object request
   * @param range Range request
   */
  public getRangedRequest(range: number[]) {
    const rangedRequest: GetObjectRequest = {
      ...this.objRequest,
      Range: `bytes=${range[0]}-${range[1]}`,
    };
    const command = new GetObjectCommand(rangedRequest)

    return this.s3.send(command);
  }
}
