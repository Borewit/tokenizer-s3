import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Pinned S3 mock image. Keep this tag stable so the integration job does not
 * change behaviour without a reviewable diff.
 */
export const S3MOCK_IMAGE = 'adobe/s3mock:5.2.3';

const S3MOCK_PORT = 9090;
const READY_TIMEOUT_MS = 30_000;
const READY_INTERVAL_MS = 200;

export interface S3TestEnvironment {
  /** Base URL the AWS SDK client should use. */
  endpoint: string;
  /** Whether this helper started (and must stop) the container. */
  managed: boolean;
  stop(): Promise<void>;
}

/**
 * Start the Docker-hosted S3 mock, or reuse an externally provided endpoint.
 *
 * Returns `undefined` when neither `S3_ENDPOINT` nor Docker is available, so
 * callers can skip instead of failing a developer machine without Docker.
 */
export async function startS3Mock(): Promise<S3TestEnvironment | undefined> {
  const externalEndpoint = process.env.S3_ENDPOINT;
  if (externalEndpoint) {
    return { endpoint: externalEndpoint, managed: false, stop: async () => undefined };
  }

  if (!(await isDockerAvailable())) {
    return undefined;
  }

  const containerName = `tokenizer-s3-${process.pid}-${randomBytes(4).toString('hex')}`;
  await execFileAsync('docker', [
    'run',
    '--rm',
    '-d',
    '--name',
    containerName,
    '-p',
    `127.0.0.1::${S3MOCK_PORT}`,
    S3MOCK_IMAGE
  ]);

  const stop = async () => {
    await execFileAsync('docker', ['rm', '-f', containerName]).catch(() => {
      // The container may already be gone (for example after a failed start).
    });
  };

  try {
    const port = await getPublishedPort(containerName);
    const endpoint = `http://127.0.0.1:${port}`;
    await waitForEndpoint(endpoint, containerName);
    return { endpoint, managed: true, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function getPublishedPort(containerName: string): Promise<string> {
  const { stdout } = await execFileAsync('docker', ['port', containerName, `${S3MOCK_PORT}/tcp`]);
  const match = /:(\d+)\s*$/.exec(stdout.trim());
  if (!match) {
    throw new Error(`Unable to determine published port from "${stdout.trim()}"`);
  }
  return match[1];
}

async function waitForEndpoint(endpoint: string, containerName: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(endpoint);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, READY_INTERVAL_MS));
    }
  }

  const logs = await execFileAsync('docker', ['logs', containerName]).then(
    ({ stdout, stderr }) => `${stdout}${stderr}`.trim(),
    () => 'unavailable'
  );
  throw new Error(`S3 mock did not become ready at ${endpoint}. Container logs:\n${logs}`);
}
