import { type S3Client, type GetObjectRequest, GetObjectCommand } from '@aws-sdk/client-s3';
import { parseContentRange, tokenizer } from '@tokenizer/range';
import { fromStream, type ITokenizer, type IRandomAccessTokenizer } from 'strtok3';
import { S3Request } from './s3-request.js';
import type { Readable } from 'node:stream';

/**
 * Initialize streaming tokenizer
 * @param s3 client
 * @param objRequest S3 object request
 * @return Tokenizer supporting random-access
 */
export async function makeStreamingTokenizerFromS3(s3: S3Client, objRequest: GetObjectRequest): Promise<ITokenizer> {
  const s3request = new S3Request(s3, objRequest);
  const info = await s3request.getRangedRequest([0, 0]);
  const contentRange = parseContentRange(info.ContentRange as string);
  const output = await s3.send(new GetObjectCommand(objRequest));
  return fromStream(output.Body as Readable, {
    fileInfo: {
      mimeType: info.ContentType,
      size: contentRange.instanceLength
    }
  });
}

/**
 * Initialize chunked / random access tokenizer to S3 object
 * @param s3 S3 client
 * @param objRequest S3 object request
 * @return Streaming tokenizer
 */
export async function makeChunkedTokenizerFromS3(s3: S3Client, objRequest: GetObjectRequest): Promise<IRandomAccessTokenizer> {
  const s3request = new S3Request(s3, objRequest);
  return tokenizer(s3request, {
    avoidHeadRequests: true
  });
}
