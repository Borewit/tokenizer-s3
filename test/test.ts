import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { type GetObjectRequest, S3Client } from '@aws-sdk/client-s3';
import { assert } from 'chai';
import { makeChunkedTokenizerFromS3, makeStreamingTokenizerFromS3 } from '../lib/index.js';
import { fileTypeFromTokenizer, type FileTypeResult } from 'file-type';
import { parseFromTokenizer as mmParseFromTokenizer } from 'music-metadata';
import type { IRandomAccessTokenizer, ITokenizer } from 'strtok3';


const fileKeys = {
  sweetManLineMe: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/01 - Nils Hoffmann - Sweet Man Like Me.mp3',
  solidGround: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/02 - Poxfil - Solid Ground.mp3',
  secretGarden: 'movies/lg-uhd-secret-garden.mkv',
  hisenseTibet: 'movies/hisense-tibet-uhd.mkv',
  smallPdf: 'file-type/small.pdf'
}

const s3 = new S3Client({
  region: 'eu-west-2',
  credentials: fromNodeProviderChain(),
});

/**
 * Helper function to create a tokenizer for S3 objects
 */
async function makeS3TestDataTokenizer(key: string, chunked: boolean): Promise<ITokenizer> {

  const objectRequest: GetObjectRequest = {
    Bucket: 'music-metadata',
    Key: key
  };

  if (chunked) {
    return makeChunkedTokenizerFromS3(s3, objectRequest);
  }
    return makeStreamingTokenizerFromS3(s3, objectRequest);
}

describe('S3 Tokenizer', function() {

  this.timeout(20000);

  describe('initialize tokenizer.fileInfo', () => {

    async function checkFileInfo(chunked) {

      const tokenizer = await makeS3TestDataTokenizer(fileKeys.sweetManLineMe, chunked)

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

  describe('Determine file-type on S3', () => {

    async function determineFileType(key:string): Promise<FileTypeResult> {
      const tokenizer = await makeS3TestDataTokenizer(key, true);
      return await fileTypeFromTokenizer(tokenizer);
    }

    it('from 8MB MP3 file', async () => {
      const fileType = await determineFileType(fileKeys.sweetManLineMe);
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'audio/mpeg', 'fileType.mime');
    });

    it('from 1 GB Matroska file', async () => {
      const fileType = await determineFileType(fileKeys.secretGarden);
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'video/x-matroska', 'fileType.mime');
    });

    it('from 2.5 GB Matroska file', async () => {
      const fileType = await determineFileType(fileKeys.hisenseTibet);
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'video/x-matroska', 'fileType.mime');
    });

    it('should parse a very small PDF file', async () => {
      const fileType = await determineFileType(fileKeys.smallPdf);
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'application/pdf', 'fileType.mime');
    });

  });

  describe('Read music-metadata on S3', () => {

    it('from 8MB MP3 file', async () => {
      const tokenizer = await makeS3TestDataTokenizer(fileKeys.sweetManLineMe, true);
      const metadata = await mmParseFromTokenizer(tokenizer);
      assert.isDefined(metadata, 'determine file-type');
      assert.strictEqual(metadata.format.container, 'MPEG', 'fileType.mime');
    });

    it('from 1 GB Matroska file', async () => {
      const tokenizer = await makeS3TestDataTokenizer(fileKeys.secretGarden, true);
      const metadata = await mmParseFromTokenizer(tokenizer, {mkvUseIndex: true});
      assert.isDefined(metadata, 'determine file-type');
      assert.strictEqual(metadata.format.container, 'EBML/matroska', 'fileType.mime');
      assert.strictEqual(metadata.format.codec, 'AC3', 'format.codec');
      assert.strictEqual(metadata.format.sampleRate, 48000, 'metadata.format.sampleRate');
      assert.approximately(metadata.format.duration, 184.69, 0.01, 'metadata.format.duration');
    });

    it('from 2.5 GB Matroska file', async () => {
      const tokenizer = await makeS3TestDataTokenizer(fileKeys.hisenseTibet, true);
      const metadata = await mmParseFromTokenizer(tokenizer, {mkvUseIndex: true});
      assert.isDefined(metadata, 'determine file-type');
      assert.strictEqual(metadata.format.container, 'EBML/matroska', 'fileType.mime');
      assert.strictEqual(metadata.format.codec, 'AC3', 'metadata.format.codec');
      assert.strictEqual(metadata.format.sampleRate, 48000, 'metadata.format.sampleRate');
      assert.approximately(metadata.format.duration, 215.68, 0.01, 'metadata.format.duration');
    });

  });

  it('Random-access-read', async () => {
    const tokenizer = await makeS3TestDataTokenizer(fileKeys.solidGround, true);
    try {
      assert.strictEqual(tokenizer.position, 0);
      assert.isTrue(tokenizer.supportsRandomAccess(), 'Random access file should be enabled');
      const textDecoder = new TextDecoder('utf-8');
      const id3v1HeaderSize = 128;
      const id3v1Header = new Uint8Array(id3v1HeaderSize);
      await tokenizer.readBuffer(id3v1Header,{position: tokenizer.fileInfo.size - id3v1HeaderSize});
      const id3v1Tag = textDecoder.decode(id3v1Header.subarray(0, 3));
      assert.strictEqual(id3v1Tag, 'TAG');
      assert.strictEqual(tokenizer.position, tokenizer.fileInfo.size, 'Tokenizer position should be at the end of the file');
      (tokenizer as IRandomAccessTokenizer).setPosition(0);
      assert.strictEqual(tokenizer.position, 0, 'Tokenizer position should be at the beginning of the file');

      const id3v2Header = new Uint8Array(3);
      await tokenizer.readBuffer(id3v2Header);
      const id3v2Tag = textDecoder.decode(id3v2Header);
      assert.strictEqual(id3v2Tag, "ID3", 'Read start tag of ID3v2 header at the beginning of the file');
    } finally {
      await tokenizer.close();
    }
  });

});
