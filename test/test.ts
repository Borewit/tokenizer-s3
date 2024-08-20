import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { S3Client } from '@aws-sdk/client-s3';
import { assert } from 'chai';
import { type IS3Options, makeTokenizer } from '../lib/index.js';
import { fileTypeFromTokenizer, type FileTypeResult } from 'file-type';
import { parseFromTokenizer as mmParseFromTokenizer } from 'music-metadata';
import type { ITokenizer } from 'strtok3';


const fileKeys = {
  sweetManLineMe: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/01 - Nils Hoffmann - Sweet Man Like Me.mp3',
  secretGarden: 'movies/lg-uhd-secret-garden.mkv',
  hisenseTibet: 'movies/hisense-tibet-uhd.mkv'
}

const s3 = new S3Client({
  region: 'eu-west-2',
  credentials: fromNodeProviderChain(),
});

/**
 * Helper function to create a tokenizer for S3 objects
 */
async function makeS3TestDataTokenizer(key:string, options?: IS3Options): Promise<ITokenizer> {

  return await makeTokenizer(s3, {
    Bucket: 'music-metadata',
    Key: key
  }, options);
}

describe('S3 Tokenizer', function() {

  this.timeout(20000);

  describe('initialize tokenizer.fileInfo', () => {

    async function checkFileInfo(disableChunked) {

      const tokenizer = await makeS3TestDataTokenizer(fileKeys.sweetManLineMe, {disableChunked})

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

    async function determineFileType(key:string, options: IS3Options): Promise<FileTypeResult> {
      const tokenizer = await makeS3TestDataTokenizer(key, options);
      return await fileTypeFromTokenizer(tokenizer);
    }

    it('from 8MB MP3 file', async () => {
      const fileType = await determineFileType(fileKeys.sweetManLineMe, {disableChunked: false});
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'audio/mpeg', 'fileType.mime');
    });

    it('from 1 GB Matroska file', async () => {
      const fileType = await determineFileType(fileKeys.secretGarden, {disableChunked: false});
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'video/x-matroska', 'fileType.mime');
    });

    it('from 2.5 GB Matroska file', async () => {
      const fileType = await determineFileType(fileKeys.hisenseTibet, {disableChunked: false});
      assert.isDefined(fileType, 'determine file-type');
      assert.strictEqual(fileType.mime, 'video/x-matroska', 'fileType.mime');
    });

  });


  describe('Read music-metadata on S3', () => {

    it('from 8MB MP3 file', async () => {
      const tokenizer = await makeS3TestDataTokenizer(fileKeys.sweetManLineMe, {disableChunked: false});
      const metadata = await mmParseFromTokenizer(tokenizer);
      assert.isDefined(metadata, 'determine file-type');
      assert.strictEqual(metadata.format.container, 'MPEG', 'fileType.mime');
    });

    it('from 1 GB Matroska file', async () => {
      const tokenizer = await makeS3TestDataTokenizer(fileKeys.secretGarden, {disableChunked: false, });
      const metadata = await mmParseFromTokenizer(tokenizer, {mkvUseIndex: true});
      assert.isDefined(metadata, 'determine file-type');
      assert.strictEqual(metadata.format.container, 'EBML/matroska', 'fileType.mime');
      assert.strictEqual(metadata.format.codec, 'AC3', 'format.codec');
      assert.strictEqual(metadata.format.sampleRate, 48000, 'metadata.format.sampleRate');
      assert.approximately(metadata.format.duration, 184.69, 0.01, 'metadata.format.duration');
    });

    it('from 2.5 GB Matroska file', async () => {
      const tokenizer = await makeS3TestDataTokenizer(fileKeys.hisenseTibet, {disableChunked: false});
      const metadata = await mmParseFromTokenizer(tokenizer, {mkvUseIndex: true});
      assert.isDefined(metadata, 'determine file-type');
      assert.strictEqual(metadata.format.container, 'EBML/matroska', 'fileType.mime');
      assert.strictEqual(metadata.format.codec, 'AC3', 'metadata.format.codec');
      assert.strictEqual(metadata.format.sampleRate, 48000, 'metadata.format.sampleRate');
      assert.approximately(metadata.format.duration, 215.68, 0.01, 'metadata.format.duration');
    });

  });

});
