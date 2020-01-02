import * as S3 from 'aws-sdk/clients/s3';
import { parseContentRange, tokenizer } from '@tokenizer/range';
import * as strtok3 from 'strtok3/lib/core';
import { S3Request } from './s3-request';

export interface IS3Options {
  /**
   * Flag to disable chunked transfer, use conventional HTTPS stream instead
   */
  disableChunked?: boolean;
}

/**
 * Initialize tokenizer from S3 object
 * @param objRequest S3 object request
 * @param options music-metadata options
 */
export async function makeTokenizer(s3: S3, objRequest: S3.Types.GetObjectRequest, options?: IS3Options): Promise<strtok3.ITokenizer> {
  const s3request = new S3Request(s3, objRequest);
  if (options && options.disableChunked) {
    const info = await s3request.getRangedRequest( [0, 0]).promise();
    const contentRange = parseContentRange(info.ContentRange);
    const stream = s3
      .getObject(objRequest)
      .createReadStream();
    return strtok3.fromStream(stream, {
      mimeType: info.ContentType,
      size: contentRange.instanceLength
    });
  } else {
    return tokenizer(s3request, {
      avoidHeadRequests: true
    });
  }
}
