const S3Tokenizer = require('../lib');
const S3 = require('aws-sdk/clients/s3');
const {assert} = require('chai');

describe('S3 Tokenizer', function () {

  this.timeout(20000);

  it('should initialize tokenizer.fileInfo', async () => {

    const s3 = new S3();

    const tokenizer = await S3Tokenizer.makeTokenizer(s3, {
      Bucket: 'music-metadata',
      Key: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/01 - Nils Hoffmann - Sweet Man Like Me.mp3'
    }, {
      disableChunked: false
    });

    // Note that: Amazon S3 returns 'audio/mp3', however the correct MIME-type for MP3 is 'audio/mpeg'
    assert.strictEqual(tokenizer.fileInfo.mimeType, 'audio/mp3', 'tokenizer.fileInfo.mimeType');
    assert.strictEqual(tokenizer.fileInfo.size, 8405814, 'tokenizer.fileInfo.size');
  });

});
