[![Build Status](https://travis-ci.org/Borewit/tokenizer-s3.svg?branch=master)](https://travis-ci.org/Borewit/tokenizer-s3)
[![NPM version](https://img.shields.io/npm/v/@tokenizer/s3.svg)](https://npmjs.org/package/@tokenizer/s3)
[![npm downloads](https://img.shields.io/npm/dm/@tokenizer/s3.svg)](https://npmcharts.com/compare/@tokenizer/s3,@tokenizer/range,streaming-http-token-reader?start=300)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/tokenizer-s3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/tokenizer-s3?targetFile=package.json)

# @tokenizer/s3
Specialized [_tokenizer_](https://github.com/Borewit/strtok3#tokenizer) to access files stored on the  [Amazon Web Services (AWS) S3 cloud storage](https://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html).

## Installation
```shell script
npm install @tokenizer/s3
```

## Reading audio metadata from Amazon S3 

Read metadata from 'My audio files/01 - My audio track.flac' stored in the S3 cloud:
```js
const { MMS3Client } = require('@tokenizer/s3');
const S3 = require('aws-sdk/clients/s3');

(async () => {

  const s3 = new S3();
  const mmS3client = new MMS3Client(s3); // Pass S3 client to music-metadata-S3-client

  console.log('Parsing...');
  try {
    const data = await mmS3client.parseS3Object({
        Bucket: 'your-bucket',
        Key: 'My audio files/01 - My audio track.flac'
      }
    );
    console.log('metadata:', data);
  } catch (e) {
    console.error(`Oops: ${e.message}`);
  }
})();
```

Using conventional streaming using the `disableChunked` flag:
```js
const { MMS3Client } = require('@tokenizer/s3');
const S3 = require('aws-sdk/clients/s3');

(async () => {

  const s3 = new S3();
  const mmS3client = new MMS3Client(s3); // Pass S3 client to music-metadata-S3-client

  console.log('Parsing...');
  try {
    const data = await mmS3client.parseS3Object({
        Bucket: 'your-bucket',
        Key: 'My audio files/01 - My audio track.flac'
      }, {
        disableChunked: true // Disable chunked transfer
      }
    );
    console.log('metadata:', data);
  } catch (e) {
    console.error(`Oops: ${e.message}`);
  }
})();
```

## Options

| option           |type       |description                                                    |
|------------------|-----------|---------------------------------------------------------------|
| `disableChunked` | `boolean` | set to `true` to switch to conventional sequential streaming. |

Other options are inherited from [music-metadata](https://github.com/Borewit/music-metadata#options)
