[![Node.js CI](https://github.com/Borewit/tokenizer-s3/actions/workflows/nodejs-ci.yml/badge.svg?branch=master)](https://github.com/Borewit/tokenizer-s3/actions/workflows/nodejs-ci.yml)
[![CodeQL](https://github.com/Borewit/tokenizer-s3/actions/workflows/github-code-scanning/codeql/badge.svg?branch=master)](https://github.com/Borewit/tokenizer-s3/actions/workflows/github-code-scanning/codeql)
[![NPM version](https://img.shields.io/npm/v/@tokenizer/s3.svg)](https://npmjs.org/package/@tokenizer/s3)
[![npm downloads](https://img.shields.io/npm/dm/@tokenizer/s3.svg)](https://npmcharts.com/compare/@tokenizer/s3,@tokenizer/range,streaming-http-token-reader?start=300)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/tokenizer-s3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/tokenizer-s3?targetFile=package.json)

# @tokenizer/s3
Specialized [_tokenizer_](https://github.com/Borewit/strtok3#tokenizer) to access files stored on the  [Amazon Web Services (AWS) S3 cloud storage](https://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html).

## Installation

```shell
npm install @tokenizer/s3
```

## Sponsor
If you appreciate my work and want to support the development of open-source projects like [music-metadata](https://github.com/Borewit/music-metadata), [file-type](https://github.com/sindresorhus/file-type), and [listFix()](https://github.com/Borewit/listFix), consider becoming a sponsor or making a small contribution.
Your support helps sustain ongoing development and improvements.
[Become a sponsor to Borewit](https://github.com/sponsors/Borewit)

or

<a href="https://www.buymeacoffee.com/borewit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy me A coffee" height="41" width="174"></a>

## API Documention

### `makeTokenizer`

Initialize a tokenizer from an Amazon S3 client for use in extracting metadata from media files.

#### Function Signature

```ts
async function makeTokenizer(
  s3: S3Client, 
  objRequest: GetObjectRequest, 
  options?: IS3Options
): Promise<ITokenizer>
```

#### Parameters

- `s3` (`S3Client`):
  
  The S3 client used to make requests to Amazon S3.
  > [!NOTE] 
  > To configure AWS client authentication see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).
 
- `objRequest` (`GetObjectRequest`):
  
  The S3 object request containing details about the S3 object to fetch.
  This includes properties like the bucket name and object key.

- `options` (`IS3Options`, optional):
  
  Optional configuration settings for the tokenizer.

  - `disableChunked`: When set to `true`, disables chunked requests and instead fetches the full object with ranged requests.

  For remaining options see [strtok3](https://github.com/Borewit/strtok3/blob/master/README.md).

#### Returns
 
- `Promise<ITokenizer>`:
 
  A Promise that resolves to an instance of `ITokenizer`.
  This tokenizer can be used to extract metadata from the specified media file in the S3 object.

## Compatibility

Module: version [0.3.0](https://github.com/Borewit/tokenizer-s3/releases/tag/v0.3.0) migrated from [CommonJS](https://en.wikipedia.org/wiki/CommonJS) to [pure ECMAScript Module (ESM)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
The distributed JavaScript codebase is compliant with the [ECMAScript 2020 (11th Edition)](https://en.wikipedia.org/wiki/ECMAScript_version_history#11th_Edition_%E2%80%93_ECMAScript_2020) standard.

This module requires a [Node.js ≥ 16](https://nodejs.org/en/about/previous-releases) engine.
It can also be used in a browser environment when bundled with a module bundler.

## Examples

### Determine S3 file type

Determine file type (based on it's content) from a file stored Amazon S3 cloud:
```js
import { fileTypeFromTokenizer } from 'file-type';
import { fromEnv } from '@aws-sdk/credential-providers';
import { S3Client } from '@aws-sdk/client-s3';
import { makeTokenizer } from '@tokenizer/s3';

(async () => {

  // Initialize S3 client
  const s3 = new S3Client({
    region: 'eu-west-2',
    credentials: fromEnv(),
  });

  // Initialize S3 tokenizer
  const s3Tokenizer = await makeTokenizer(s3, {
    Bucket: 'affectlab',
    Key: '1min_35sec.mp4'
  });

  // Figure out what kind of file it is
  const fileType = await fileTypeFromTokenizer(s3Tokenizer);
  console.log(fileType);
})();
```

See also [example at file-type](https://github.com/sindresorhus/file-type#filetypefromtokenizertokenizer).

### Reading audio metadata from Amazon S3 

Retrieve music-metadata 
```js
import { makeTokenizer } from '@tokenizer/s3';
import { S3Client } from '@aws-sdk/client-s3';
import { parseFromTokenizer } from 'music-metadata/lib/core';

/**
 * Retrieve metadata from Amazon S3 object
 * @param objRequest S3 object request
 * @param options `tokenizer-s3` options
 * @return Metadata
 */
async function parseS3Object(s3, objRequest, options) {
  const s3Tokenizer = await makeTokenizer(s3, objRequest, options);
  return parseFromTokenizer(s3Tokenizer, options);
}

(async () => {
  const s3 = new S3Client({});

  const metadata = await parseS3Object(s3, {
    Bucket: 'standing0media',
    Key: '01 Where The Highway Takes Me.mp3'
  });

  console.log(metadata);
})();
```

A module implementation of this example can be found in [@music-metadata/s3](https://github.com/Borewit/music-metadata-s3).

## Dependency graph

![dependency graph](doc/dependency.svg)
