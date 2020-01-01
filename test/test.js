const S3Tokenizer = require('../lib');
const S3 = require('aws-sdk/clients/s3');
const {assert} = require('chai');

describe('S3 Tokenizer', function () {

  this.timeout(20000);

  it('explicitly set', async () => {

    const s3 = new S3();

    const tokenizer = await S3Tokenizer.makeTokenizer(s3, {
      Bucket: 'music-metadata',
      Key: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/01 - Nils Hoffmann - Sweet Man Like Me.mp3'
    }, {
      disableChunked: false
    });
  });

});

