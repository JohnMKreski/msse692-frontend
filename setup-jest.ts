// Jest setup for Angular 19
// import 'jest-preset-angular/setup-jest'; //Deprecitaed
import 'zone.js';
import 'zone.js/testing';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();