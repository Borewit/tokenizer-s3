import { S3Client, GetObjectRequest, GetObjectCommand } from '@aws-sdk/client-s3';
import { parseContentRange, tokenizer } from '@tokenizer/range';
import { fromStream, type ITokenizer } from 'strtok3';
import { S3Request } from './s3-request.js';
import { Readable } from 'stream';

export interface IS3Options {
  /**
   * Flag to disable chunked transfer, use conventional HTTPS stream instead
   */
  disableChunked?: boolean;
}

/**
 * Initialize tokenizer from S3 object
 * @param s3 S3 client
 * @param objRequest S3 object request
 * @param options music-metadata options
 * @return Tokenizer
 */
export async function makeTokenizer(s3: S3Client, objRequest: GetObjectRequest, options?: IS3Options): Promise<ITokenizer> {
  const s3request = new S3Request(s3, objRequest);
  if (options && options.disableChunked) {
    const info = await s3request.getRangedRequest([0, 0]);
    const contentRange = parseContentRange(info.ContentRange);
    const output = await s3.send(new GetObjectCommand(objRequest));
    return fromStream(output.Body as Readable, {
      fileInfo: {
        mimeType: info.ContentType,
        size: contentRange.instanceLength
      }
    });
  } else {
    return tokenizer(s3request, {
      avoidHeadRequests: true
    });
  }
}
