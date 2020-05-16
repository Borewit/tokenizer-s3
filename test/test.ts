import { S3Client } from '@aws-sdk/client-s3';
import { assert } from 'chai';
import { makeTokenizer } from '../lib';

describe('S3 Tokenizer', function() {

  this.timeout(20000);
  const s3 = new S3Client({});

  describe('initialize tokenizer.fileInfo', () => {

    async function checkFileInfo(disableChunked) {

      const tokenizer = await makeTokenizer(s3, {
        Bucket: 'music-metadata',
        Key: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/01 - Nils Hoffmann - Sweet Man Like Me.mp3'
      }, {
        disableChunked: disableChunked
      });

      // Note that: Amazon S3 returns 'audio/mp3', however the correct MIME-type for MP3 is 'audio/mpeg'
      assert.strictEqual(tokenizer.fileInfo.mimeType, 'audio/mp3', 'tokenizer.fileInfo.mimeType');
      assert.strictEqual(tokenizer.fileInfo.size, 8405814, 'tokenizer.fileInfo.size');
    }

    it('from chunked transfer', async () => {
      await checkFileInfo(false);
    });

    it('from stream', async () => {
      await checkFileInfo(true);
    });

  });

});
