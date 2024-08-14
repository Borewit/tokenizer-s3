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

## Compatibility

Starting with version [0.3.0](https://github.com/Borewit/tokenizer-s3/releases/tag/v0.3.0), the module has migrated from [CommonJS](https://en.wikipedia.org/wiki/CommonJS) to [pure ECMAScript Module (ESM)](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
The distributed JavaScript codebase is compliant with the [ECMAScript 2020 (11th Edition)](https://en.wikipedia.org/wiki/ECMAScript_version_history#11th_Edition_%E2%80%93_ECMAScript_2020) standard.

This module requires a [Node.js ≥ 16](https://nodejs.org/en/about/previous-releases) engine.
It can also be used in a browser environment when bundled with a module bundler, like [Webpack](https://webpack.js.org/).

## Installation

```shell script
npm install @tokenizer/s3 @aws-sdk/client-s3
```

To configure AWS client authentication see [Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).

## Sponsor
If you appreciate my work and want to support the development of open-source projects like [music-metadata](https://github.com/Borewit/music-metadata), [file-type](https://github.com/sindresorhus/file-type), and [listFix()](https://github.com/Borewit/listFix), consider becoming a sponsor or making a small contribution.
Your support helps sustain ongoing development and improvements.
[Become a sponsor to Borewit](https://github.com/sponsors/Borewit)

or

<a href="https://www.buymeacoffee.com/borewit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy me A coffee" height="41" width="174"></a>


## Examples

### Determine S3 file type

Determine file type (based on it's content) from a file stored Amazon S3 cloud:
```js
const FileType = require('file-type');
import { fromEnv } from '@aws-sdk/credential-providers';
import { S3Client } from '@aws-sdk/client-s3';
const { makeTokenizer } = require('@tokenizer/s3');

(async () => {

  // Initialize S3 client
  const s3 = new S3Client({
    region: 'eu-west-2',
    credentials: fromEnv(),
  });

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
const { S3Client } = require('@aws-sdk/client-s3');
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
  const s3 = new S3Client({});

  const metadata = await parseS3Object(s3, {
    Bucket: 'standing0media',
    Key: '01 Where The Highway Takes Me.mp3'
    }
  );

  console.log(metadata);
})();
```

An module implementation of this example can be found in [@music-metadata/s3](https://github.com/Borewit/music-metadata-s3).

## Dependency graph

![dependency graph](doc/dependency.svg)
