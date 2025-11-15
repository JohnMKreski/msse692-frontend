/* Jest configuration for Angular 19 using jest-preset-angular */

module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'jest']
  },
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  globalSetup: 'jest-preset-angular/global-setup',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        isolatedModules: true
      }
    ]
  },
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleFileExtensions: ['ts', 'html', 'js', 'mjs'],
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage-jest',
  coverageReporters: ['text', 'lcov'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'logs',
        outputName: 'junit.xml',
        suiteName: 'jest-tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ]
  ]
};
