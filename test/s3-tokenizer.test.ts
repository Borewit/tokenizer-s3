import { assert } from 'chai';
import { makeChunkedTokenizerFromS3, makeStreamingTokenizerFromS3 } from '../lib/index.js';
import { createPatternData, FakeS3Client } from './fake-s3-client.js';

const size = 5000;
const key = 'audio/sample.mp3';
const contentType = 'audio/mp3';

function createClient() {
  return new FakeS3Client({
    [key]: { data: createPatternData(size), contentType }
  });
}

describe('S3 tokenizer (offline)', () => {
  describe('makeStreamingTokenizerFromS3', () => {
    it('reads file-info from the probe request and the body from the full request', async () => {
      const s3 = createClient();
      const tokenizer = await makeStreamingTokenizerFromS3(s3, { Bucket: 'bucket', Key: key });
      try {
        assert.strictEqual(tokenizer.fileInfo.mimeType, contentType, 'fileInfo.mimeType');
        assert.strictEqual(tokenizer.fileInfo.size, size, 'fileInfo.size');

        const buffer = new Uint8Array(16);
        await tokenizer.readBuffer(buffer);
        assert.deepEqual(Array.from(buffer), Array.from(createPatternData(16)), 'first bytes');

        assert.lengthOf(s3.requests, 2, 'request count');
        assert.strictEqual(s3.requests[0].Range, 'bytes=0-0', 'probe range');
        assert.isUndefined(s3.requests[1].Range, 'body request has no range');
      } finally {
        await tokenizer.close();
      }
    });

    it('reports the MIME-type provided by the client', async () => {
      const s3 = new FakeS3Client({
        [key]: { data: createPatternData(size), contentType: 'application/octet-stream' }
      });
      const tokenizer = await makeStreamingTokenizerFromS3(s3, { Bucket: 'bucket', Key: key });
      try {
        assert.strictEqual(tokenizer.fileInfo.mimeType, 'application/octet-stream');
      } finally {
        await tokenizer.close();
      }
    });
  });

  describe('makeChunkedTokenizerFromS3', () => {
    it('resolves file-info with a ranged GET instead of a HEAD request', async () => {
      const s3 = createClient();
      const tokenizer = await makeChunkedTokenizerFromS3(s3, { Bucket: 'bucket', Key: key });
      try {
        assert.strictEqual(tokenizer.fileInfo.mimeType, contentType, 'fileInfo.mimeType');
        assert.strictEqual(tokenizer.fileInfo.size, size, 'fileInfo.size');
        assert.isTrue(tokenizer.supportsRandomAccess(), 'supportsRandomAccess');
        assert.lengthOf(s3.requests, 1, 'initial request count');
        assert.strictEqual(s3.requests[0].Range, 'bytes=0-4096', 'initial chunk range');
      } finally {
        await tokenizer.close();
      }
    });

    it('requests an additional range for bytes outside the cached chunk', async () => {
      const s3 = createClient();
      const tokenizer = await makeChunkedTokenizerFromS3(s3, { Bucket: 'bucket', Key: key });
      try {
        const buffer = new Uint8Array(16);
        await tokenizer.readBuffer(buffer, { position: 4500 });
        assert.deepEqual(Array.from(buffer), Array.from(createPatternData(size).subarray(4500, 4516)));
        assert.lengthOf(s3.requests, 2, 'request count');
        assert.strictEqual(s3.requests[1].Range, 'bytes=4500-4999', 'clamped range');
      } finally {
        await tokenizer.close();
      }
    });

    it('accumulates the read position across requests', async () => {
      const s3 = createClient();
      const tokenizer = await makeChunkedTokenizerFromS3(s3, { Bucket: 'bucket', Key: key });
      try {
        assert.strictEqual(tokenizer.position, 0);
        await tokenizer.readBuffer(new Uint8Array(4));
        assert.strictEqual(tokenizer.position, 4);
        await tokenizer.readBuffer(new Uint8Array(4));
        assert.strictEqual(tokenizer.position, 8);
      } finally {
        await tokenizer.close();
      }
    });

    it('aborts in-flight requests', async () => {
      const s3 = createClient();
      const tokenizer = await makeChunkedTokenizerFromS3(s3, { Bucket: 'bucket', Key: key });
      try {
        await tokenizer.abort();
        let error: unknown;
        try {
          await tokenizer.readBuffer(new Uint8Array(8), { position: 4500 });
        } catch (err) {
          error = err;
        }
        assert.instanceOf(error, Error, 'read after abort fails');
        assert.isTrue(s3.abortedSignals[s3.abortedSignals.length - 1], 'request signalled abort');
      } finally {
        await tokenizer.close();
      }
    });
  });
});
