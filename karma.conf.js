// Karma configuration for Angular CLI project
// Configures Firefox headless as the default test browser.

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-firefox-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-spec-reporter'),
    ],
    client: {
      jasmine: {},
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/msse692-frontend'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['spec', 'kjhtml'],
    specReporter: {
      suppressPassed: true,
      suppressSkipped: true,
      showSpecTiming: false,
      suppressErrorSummary: true, // hide detailed error summary lines
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_ERROR,
    autoWatch: true,
    browsers: ['FirefoxHeadless'],
    singleRun: false,
    restartOnFileChange: true,
    customLaunchers: {
      EdgeHeadless: {
        base: 'Edge',
        flags: [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    },
  });
};
