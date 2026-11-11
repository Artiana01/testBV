'use strict';

module.exports = [
  { key: 'buildnivo', port: 4009, images: [
    { role: 'front', image: 'app-buildnivo-dev' },
    { role: 'api', image: 'api-buildnivo-dev' },
  ] },
  { key: 'bvtech', port: 4001, images: [
    { role: 'front', image: 'bluevaloris-tech' },
    { role: 'api', image: 'bv-tech-api' },
  ] },
  { key: 'bvbusiness', port: 4002, images: [
    { role: 'front', image: 'bvb-frontend-staging' },
    { role: 'api', image: 'bvb-back-staging' },
  ] },
  { key: 'bvinvest', port: 4003, images: [
    { role: 'front', image: 'bluevaloris-invest-frontend' },
    { role: 'api', image: 'bluevaloris-invest-backend' },
  ] },
  { key: 'emiragate', port: 4004, images: [
    { role: 'front', image: 'emiragate-frontend-dev' },
    { role: 'api', image: 'emiragate-api' },
  ] },
  { key: 'bvportage', port: 4005, images: [
    { role: 'front', image: 'bluevaloris-portage-app-v1-staging' },
    { role: 'api', image: 'bluevaloris-portage-api-v1' },
  ] },
  { key: 'bvportageFreelance', port: 4006, images: [
    { role: 'front', image: 'bluevaloris-portage-app-v1-staging' },
    { role: 'api', image: 'bluevaloris-portage-api-v1' },
  ] },
  { key: 'creerailleurs', port: 4007, images: [
    { role: 'front', image: 'creerailleurs-front-dev' },
    { role: 'api', image: 'creerailleurs-api-devprod' },
  ] },
  { key: 'launchpad', port: 4008, images: [
    { role: 'front', image: 'bluevaloris-tech-staging' },
    { role: 'api', image: 'bv-tech-api-staging' },
  ] },
];
