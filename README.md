[![Build Status](https://travis-ci.org/Borewit/tokenizer-s3.svg?branch=master)](https://travis-ci.org/Borewit/tokenizer-s3)
[![NPM version](https://img.shields.io/npm/v/@tokenizer/s3.svg)](https://npmjs.org/package/@tokenizer/s3)
[![npm downloads](https://img.shields.io/npm/dm/@tokenizer/s3.svg)](https://npmcharts.com/compare/@tokenizer/s3,@tokenizer/range,streaming-http-token-reader?start=300)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/tokenizer-s3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/tokenizer-s3?targetFile=package.json)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/Borewit/tokenizer-s3.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/Borewit/tokenizer-s3/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/Borewit/tokenizer-s3.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/Borewit/tokenizer-s3/context:javascript)

# @tokenizer/s3
Specialized [_tokenizer_](https://github.com/Borewit/strtok3#tokenizer) to access files stored on the  [Amazon Web Services (AWS) S3 cloud storage](https://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html).

## Installation
```shell script
npm install @tokenizer/s3
```

## Examples

### Determine S3 file type

Determine file type (based on it's content) from a file stored Amazon S3 cloud:
```js
const FileType = require('file-type');
const S3 = require('aws-sdk/clients/s3');
const { makeTokenizer } = require('@tokenizer/s3');

(async () => {

  // Initialize S3 client
  const s3 = new S3();

  // Initialize  S3 tokenizer
  const s3Tokenizer = await makeTokenizer(s3, {
    Bucket: 'affectlab',
    Key: '1min_35sec.mp4'
  });

  // Figure out what kind of file it is
  const fileType = await FileType.fromTokenizer(s3Tokenizer);
  console.log(fileType);
})();
```

See also [example at file-type](https://github.com/sindresorhus/file-type#filetypefromtokenizertokenizer).

### Reading audio metadata from Amazon S3 

Retrieve music-metadata 
```js
const s3tokenizer = require("@tokenizer/s3");
const mm = require("music-metadata/lib/core");
/**
 * Retrieve metadata from Amazon S3 object
 * @param objRequest S3 object request
 * @param options music-metadata options
 * @return Metadata
 */
async function parseS3Object(s3, objRequest, options) {
    const s3Tokenizer = await  s3tokenizer.makeTokenizer(s3, objRequest, options);
    return mm.parseFromTokenizer(s3Tokenizer, options);
}

(async () => {
  const s3 = new S3();
  
  const metadata = await mmS3client.parseS3Object({
        Bucket: 'music-metadata',
        Key: 'Various Artists - 2008 - netBloc Vol 13 (color in a world of monochrome) {BSCOMP0013} [MP3-V0]/01 - Nils Hoffmann - Sweet Man Like Me.mp3'
      }
    );
})();
```

An module implementation of this example can be found in [@music-metadata/s3](https://github.com/Borewit/music-metadata-s3).

## Dependency graph

![dependency graph](doc/dependency.svg)
