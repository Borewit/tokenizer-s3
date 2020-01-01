import { IRangeRequestClient, IRangeRequestResponse, parseContentRange } from '@tokenizer/range';
import * as S3 from 'aws-sdk/clients/s3';
import { AWSError, Request } from 'aws-sdk';

/**
 * Use S3-client to execute actual HTTP-requests.
 */
export class S3Request implements IRangeRequestClient {

  constructor(private s3: S3, private objRequest: S3.Types.GetObjectRequest) {
  }

  public async getResponse(method, range: number[]): Promise<IRangeRequestResponse> {

    const response = await this.getRangedRequest(this.objRequest, range).promise();

    const contentRange = parseContentRange(response.ContentRange);

    return {
      size: contentRange.instanceLength,
      mimeType: response.ContentType,
      contentRange: contentRange,
      arrayBuffer: async () => {
        return response.Body as Buffer;
      }
    };
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
