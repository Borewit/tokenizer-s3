import { S3Client } from '@aws-sdk/client-s3';
import { assert } from 'chai';
import { makeTokenizer } from '../lib';

describe('S3 Tokenizer', function() {

  this.timeout(20000);
  const s3 = new S3Client({});

  describe('initialize tokenizer.fileInfo', () => {

    async function checkFileInfo(disableChunked) {

      const tokenizer = await makeTokenizer(s3, {
        Bucket: 'xiph-media',
        Key: 'nrk/gpsData.zip'
      }, {
        disableChunked: disableChunked
      });

      assert.strictEqual(tokenizer.fileInfo.mimeType, 'application/zip', 'tokenizer.fileInfo.mimeType');
      assert.strictEqual(tokenizer.fileInfo.size, 1727328, 'tokenizer.fileInfo.size');
    }

    it('from chunked transfer', async () => {
      await checkFileInfo(false);
    });

    it('from stream', async () => {
      await checkFileInfo(true);
    });

  });

});
