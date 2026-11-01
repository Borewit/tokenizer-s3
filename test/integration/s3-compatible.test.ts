import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { assert } from 'chai';
import { fileTypeFromTokenizer } from 'file-type';
import { parseFromTokenizer } from 'music-metadata';
import { makeChunkedTokenizerFromS3, makeStreamingTokenizerFromS3 } from '../../lib/index.js';
import { type S3TestEnvironment, startS3Mock } from './s3mock.js';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixture', 'silence.wav');
const bucket = `tokenizer-s3-${process.pid}`;
const key = 'audio/silence.wav';

describe('S3-compatible endpoint (Docker)', function () {
  this.timeout(120_000);

  let environment: S3TestEnvironment | undefined;
  let client: S3Client;
  let wav: Uint8Array;

  before(async function () {
    environment = await startS3Mock();
    if (!environment) {
      console.warn('Skipping Docker S3 tests: Docker is not available and S3_ENDPOINT is not set');
      this.skip();
    }

    wav = new Uint8Array(await readFile(fixturePath));
    client = new S3Client({
      region: 'us-east-1',
      endpoint: environment.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    });

    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const code = (error as Error).name;
      if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
        throw error;
      }
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: wav,
        ContentType: 'audio/x-wav'
      })
    );
  });

  after(async () => {
    if (!environment) {
      return;
    }
    if (client) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
      await client.send(new DeleteBucketCommand({ Bucket: bucket })).catch(() => undefined);
      client.destroy();
    }
    await environment.stop();
  });

  it('initializes a chunked tokenizer with the object size and MIME-type', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, { Bucket: bucket, Key: key });
    try {
      assert.strictEqual(tokenizer.fileInfo.size, wav.length, 'fileInfo.size');
      assert.strictEqual(tokenizer.fileInfo.mimeType, 'audio/x-wav', 'fileInfo.mimeType');
      assert.isTrue(tokenizer.supportsRandomAccess(), 'supportsRandomAccess');
    } finally {
      await tokenizer.close();
    }
  });

  it('detects the file type from a ranged read', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, { Bucket: bucket, Key: key });
    const fileType = await fileTypeFromTokenizer(tokenizer);
    assert.strictEqual(fileType?.mime, 'audio/wav', 'fileType.mime');
  });

  it('parses metadata from a ranged read', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, { Bucket: bucket, Key: key });
    try {
      const metadata = await parseFromTokenizer(tokenizer);
      assert.strictEqual(metadata.format.container, 'WAVE', 'format.container');
      assert.strictEqual(metadata.format.sampleRate, 8000, 'format.sampleRate');
      assert.strictEqual(metadata.format.numberOfChannels, 1, 'format.numberOfChannels');
      assert.approximately(metadata.format.duration ?? 0, 1, 0.01, 'format.duration');
    } finally {
      await tokenizer.close();
    }
  });

  it('reads random-access ranges beyond the initial chunk', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, { Bucket: bucket, Key: key });
    try {
      const start = wav.length - 12;
      const tail = new Uint8Array(12);
      await tokenizer.readBuffer(tail, { position: start });
      assert.deepEqual(Array.from(tail), Array.from(wav.subarray(start)), 'tail bytes');
      assert.strictEqual(tokenizer.position, wav.length, 'tokenizer position');
    } finally {
      await tokenizer.close();
    }
  });

  it('reads a streamed object', async () => {
    const tokenizer = await makeStreamingTokenizerFromS3(client, { Bucket: bucket, Key: key });
    try {
      assert.strictEqual(tokenizer.fileInfo.size, wav.length, 'fileInfo.size');
      const header = new Uint8Array(12);
      await tokenizer.readBuffer(header);
      assert.deepEqual(Array.from(header), Array.from(wav.subarray(0, 12)), 'RIFF header');
    } finally {
      await tokenizer.close();
    }
  });

  it('rejects a missing object', async () => {
    let error: unknown;
    try {
      const tokenizer = await makeChunkedTokenizerFromS3(client, { Bucket: bucket, Key: 'audio/missing.wav' });
      await tokenizer.close();
    } catch (err) {
      error = err;
    }
    assert.instanceOf(error, Error, 'missing object is rejected');
  });
});
