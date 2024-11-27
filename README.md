[![Node.js CI](https://github.com/Borewit/tokenizer-s3/actions/workflows/nodejs-ci.yml/badge.svg?branch=master)](https://github.com/Borewit/tokenizer-s3/actions/workflows/nodejs-ci.yml)
[![CodeQL](https://github.com/Borewit/tokenizer-s3/actions/workflows/github-code-scanning/codeql/badge.svg?branch=master)](https://github.com/Borewit/tokenizer-s3/actions/workflows/github-code-scanning/codeql)
[![NPM version](https://img.shields.io/npm/v/@tokenizer/s3.svg)](https://npmjs.org/package/@tokenizer/s3)
[![npm downloads](https://img.shields.io/npm/dm/@tokenizer/s3.svg)](https://npmcharts.com/compare/@tokenizer/s3,@tokenizer/range,streaming-http-token-reader?start=300)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/tokenizer-s3/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/tokenizer-s3?targetFile=package.json)

# @tokenizer/s3
The tokenizer-s3 module enables seamless integration with [Amazon Web Services (AWS) S3](https://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html), allowing you to read and tokenize data from S3 objects in a streaming fashion. This module extends the functionality of the strtok3 tokenizer by providing support for chunked S3 data access.

## Features
Streaming Support: Efficiently read and tokenize data from Amazon S3 objects using streaming, which is ideal for handling large files without loading them entirely into memory.
Integration with [strtok3](https://github.com/Borewit/strtok3): Works seamlessly with the [strtok3](https://github.com/Borewit/strtok3) tokenizer to process S3 data streams, making it easy to handle various tokenization tasks.
Flexible Access: Provides options to configure S3 access, allowing for customized tokenization workflows based on your specific needs.
Promise-Based API: Utilizes a promise-based API for easy integration into modern asynchronous workflows.

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

### `makeChunkedTokenizerFromS3`

Initialize a tokenizer, with the option for random access, 
from an Amazon S3 client for use in extracting metadata from media files.

#### Function Signature

```ts
function makeChunkedTokenizerFromS3(s3: S3Client, objRequest: GetObjectRequest): Promise<IRandomAccessTokenizer>
```
Reads from the S3 as a stream.

#### Parameters

- `s3` (`S3Client`):

  The S3 client used to make requests to Amazon S3.
  > [!NOTE]
  > To configure AWS client authentication see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

- `objRequest` (`GetObjectRequest`):

  The S3 object request containing details about the S3 object to fetch.
  This includes properties like the bucket name and object key.

- `options` (`IS3Options`, optional):

#### Returns

- `Promise<IRandomAccessTokenizer>`:

  A Promise that resolves to an instance of `IRandomAccessTokenizer`.
  This tokenizer can be used to extract metadata from the specified media file in the S3 object.
  It supports [random access](https://en.wikipedia.org/wiki/Random_access) reads. 

### `makeStreamingTokenizerFromS3`

Initialize a tokenizer from an Amazon S3 client for use in extracting metadata from media files.

#### Function Signature

```ts
function makeStreamingTokenizerFromS3(s3: S3Client, objRequest: GetObjectRequest): Promise<ITokenizer>
```
Reads from the S3 as a stream.

#### Parameters

- `s3` (`S3Client`):
  
  The S3 client used to make requests to Amazon S3.
  > [!NOTE] 
  > To configure AWS client authentication see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).
 
- `objRequest` (`GetObjectRequest`):
  
  The S3 object request containing details about the S3 object to fetch.
  This includes properties like the bucket name and object key.

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
import { makeChunkedTokenizerFromS3 } from '@tokenizer/s3';

(async () => {

  // Initialize S3 client
  const s3 = new S3Client({
    region: 'eu-west-2',
    credentials: fromEnv(),
  });

  // Initialize S3 tokenizer
  const s3Tokenizer = await makeChunkedTokenizerFromS3(s3, {
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
import { makeChunkedTokenizerFromS3 } from '@tokenizer/s3';
import { S3Client } from '@aws-sdk/client-s3';
import { parseFromTokenizer } from 'music-metadata/lib/core';

/**
 * Retrieve metadata from Amazon S3 object
 * @param objRequest S3 object request
 * @param options `tokenizer-s3` options
 * @return Metadata
 */
async function parseS3Object(s3, objRequest, options) {
  const s3Tokenizer = await makeChunkedTokenizerFromS3(s3, objRequest);
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
