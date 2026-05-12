import { env } from '$env/dynamic/private';

export function requirePrivateEnv(name: string): string {
    const value = env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
