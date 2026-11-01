import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type GetObjectRequest, S3Client } from '@aws-sdk/client-s3';
import { assert } from 'chai';
import { fileTypeFromTokenizer } from 'file-type';
import { parseFromTokenizer } from 'music-metadata';
import { makeChunkedTokenizerFromS3, makeStreamingTokenizerFromS3 } from '../lib/index.js';
import { S3CompatibleServer } from './s3-compatible-server.js';

const key = 'audio/silence.wav';
const etag = '"abc123"';
const versionId = 'v1';
const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixture', 'silence.wav');

describe('S3-compatible endpoint (offline)', function () {
  this.timeout(10000);

  let server: S3CompatibleServer;
  let endpoint: string;
  let client: S3Client;
  let wav: Uint8Array;

  before(async () => {
    wav = new Uint8Array(await readFile(fixturePath));
    server = new S3CompatibleServer();
    server.addObject(key, { data: wav, contentType: 'audio/x-wav', etag, versionId });
    endpoint = await server.start();
    client = new S3Client({
      region: 'us-east-1',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    });
  });

  after(async () => {
    client.destroy();
    await server.stop();
  });

  function objectRequest(overrides: Partial<GetObjectRequest> = {}): GetObjectRequest {
    return { Bucket: server.bucket, Key: key, ...overrides };
  }

  it('reads file-info and detects the file type through the AWS SDK client', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, objectRequest());
    try {
      assert.strictEqual(tokenizer.fileInfo.mimeType, 'audio/x-wav', 'fileInfo.mimeType');
      assert.strictEqual(tokenizer.fileInfo.size, wav.length, 'fileInfo.size');

      const fileType = await fileTypeFromTokenizer(tokenizer);
      assert.strictEqual(fileType?.mime, 'audio/wav', 'fileType.mime');
    } finally {
      await tokenizer.close();
    }
  });

  it('parses metadata of a ranged read', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, objectRequest());
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

  it('reads a streamed object', async () => {
    const tokenizer = await makeStreamingTokenizerFromS3(client, objectRequest());
    try {
      assert.strictEqual(tokenizer.fileInfo.size, wav.length, 'fileInfo.size');
      const header = new Uint8Array(4);
      await tokenizer.readBuffer(header);
      assert.strictEqual(Buffer.from(header).toString('latin1'), 'RIFF', 'RIFF header');
    } finally {
      await tokenizer.close();
    }
  });

  it('forwards version and conditional headers to the endpoint', async () => {
    const tokenizer = await makeChunkedTokenizerFromS3(client, objectRequest({ VersionId: versionId, IfMatch: etag }));
    try {
      assert.strictEqual(tokenizer.fileInfo.size, wav.length, 'fileInfo.size');
      const request = server.requests[server.requests.length - 1];
      assert.strictEqual(request.versionId, versionId, 'versionId');
      assert.strictEqual(request.ifMatch, etag, 'if-match');
      assert.isDefined(request.range, 'range header');
    } finally {
      await tokenizer.close();
    }
  });

  it('rejects an empty object', async () => {
    server.addObject('empty', { data: new Uint8Array(0), contentType: 'application/octet-stream' });
    let error: unknown;
    try {
      const tokenizer = await makeChunkedTokenizerFromS3(client, { Bucket: server.bucket, Key: 'empty' });
      await tokenizer.close();
    } catch (err) {
      error = err;
    }
    assert.instanceOf(error, Error, 'empty object is rejected');
  });

  it('rejects an endpoint that ignores ranged requests', async () => {
    const plainServer = new S3CompatibleServer({ ignoreRange: true });
    plainServer.addObject(key, { data: wav, contentType: 'audio/x-wav' });
    const plainEndpoint = await plainServer.start();
    const plainClient = new S3Client({
      region: 'us-east-1',
      endpoint: plainEndpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    });
    try {
      let error: unknown;
      try {
        await makeChunkedTokenizerFromS3(plainClient, { Bucket: plainServer.bucket, Key: key });
      } catch (err) {
        error = err;
      }
      assert.instanceOf(error, Error, 'request is rejected');
      assert.match((error as Error).message, /Content range must be provided/);
    } finally {
      plainClient.destroy();
      await plainServer.stop();
    }
  });
});
