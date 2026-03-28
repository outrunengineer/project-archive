import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Redirect Prisma's ESM runtime files to their CJS equivalents
    '^@prisma/client/runtime/(.+)\\.mjs$': '<rootDir>/node_modules/@prisma/client/runtime/$1.js',
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['components/**/*.{ts,tsx}', 'lib/**/*.ts'],
};

export default createJestConfig(config);
