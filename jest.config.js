// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  collectCoverageFrom: ['src/**/*.{js,ts}', '!src/**/*.d.ts'],
  testMatch: ['<rootDir>/src/**/?(*.)spec.{js,ts}'],
  testEnvironment: 'node'
}
