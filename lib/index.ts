import * as S3 from 'aws-sdk/clients/s3';
import { IRangeRequestClient, IRangeRequestResponse, parseContentRange, tokenizer } from '@tokenizer/range';
import { AWSError, Request } from 'aws-sdk';
import * as strtok3 from 'strtok3/lib/core';

export interface IS3Options {
  /**
   * Flag to disable chunked transfer, use conventional HTTPS stream instead
   */
  disableChunked?: boolean;
}

/**
 * Use S3-client to execute actual HTTP-requests.
 */
class S3Request implements IRangeRequestClient {

  constructor(private s3: S3, private objRequest: S3.Types.GetObjectRequest) {
  }

  public async getResponse(method, range: number[]): Promise<IRangeRequestResponse> {

    return this.getRangedRequest(this.objRequest, range).promise().then(data => {
      return {
        contentLength: data.ContentLength,
        contentType: data.ContentType,
        contentRange: parseContentRange(data.ContentRange),
        arrayBuffer: async () => {
          return data.Body as Buffer;
        }
      };
    });
  }

  /**
   * Do a ranged request, this method will be called by streaming-http-token-reader
   * @param objRequest
   * @param range
   */
  private getRangedRequest(objRequest: S3.Types.GetObjectRequest, range: number[]): Request<S3.Types.GetObjectOutput, AWSError> {
    const rangedRequest = {...objRequest}; // Copy request
    rangedRequest.Range = `bytes=${range[0]}-${range[1]}`;
    return this.s3.getObject(rangedRequest);
  }
}

/**
 * Initialize tokenizer from S3 object
 * @param objRequest S3 object request
 * @param options music-metadata options
 */
export async function makeTokenizer(s3: S3, objRequest: S3.Types.GetObjectRequest, options?: IS3Options): Promise<strtok3.ITokenizer> {
  if (options && options.disableChunked) {
    const info = await this.getRangedRequest(objRequest, [0, 0]).promise();
    const stream = s3
      .getObject(objRequest)
      .createReadStream();
    return strtok3.fromStream(stream, info);
  } else {
    const s3request = new S3Request(s3, objRequest);
    return tokenizer(s3request, {
      avoidHeadRequests: true
    });
  }
}
