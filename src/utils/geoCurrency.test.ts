import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countryFromAcceptLanguage,
  countryFromTimeZone,
  countryToCurrency,
  extractCountryFromHeaders,
  extractPublicClientIp,
} from './geoCurrency';

test('countryToCurrency maps PK->PKR, IN->INR, and all other countries to USD', () => {
  assert.equal(countryToCurrency('PK'), 'PKR');
  assert.equal(countryToCurrency('pk'), 'PKR');
  assert.equal(countryToCurrency('IN'), 'INR');
  assert.equal(countryToCurrency('in'), 'INR');
  assert.equal(countryToCurrency('US'), 'USD');
  assert.equal(countryToCurrency('GB'), 'USD');
  assert.equal(countryToCurrency('AE'), 'USD');
  assert.equal(countryToCurrency(null), 'USD');
  assert.equal(countryToCurrency('ZZ'), 'USD');
});

test('extractCountryFromHeaders resolves standard CDN/Cloud proxy geo headers', () => {
  assert.equal(extractCountryFromHeaders({ 'cf-ipcountry': 'PK' }), 'PK');
  assert.equal(extractCountryFromHeaders({ 'X-AppEngine-Country': 'IN' }), 'IN');
  assert.equal(extractCountryFromHeaders({ 'x-vercel-ip-country': 'DE' }), 'DE');
  assert.equal(extractCountryFromHeaders({ 'cf-ipcountry': 'XX' }), null);
  assert.equal(extractCountryFromHeaders({}), null);
});

test('extractPublicClientIp returns first valid public IP and skips private/loopback IPs', () => {
  assert.equal(extractPublicClientIp('127.0.0.1, 10.0.0.5', '192.168.1.10'), null);
  assert.equal(extractPublicClientIp('::1', '::ffff:127.0.0.1'), null);
  assert.equal(extractPublicClientIp('39.42.100.12, 10.0.0.1'), '39.42.100.12');
  assert.equal(extractPublicClientIp(undefined, '::ffff:49.36.120.5'), '49.36.120.5');
});

test('countryFromTimeZone and countryFromAcceptLanguage detect Pakistan and India accurately', () => {
  assert.equal(countryFromTimeZone('Asia/Karachi'), 'PK');
  assert.equal(countryFromTimeZone('Asia/Kolkata'), 'IN');
  assert.equal(countryFromTimeZone('Asia/Calcutta'), 'IN');
  assert.equal(countryFromTimeZone('America/New_York'), null);

  assert.equal(countryFromAcceptLanguage('ur-PK,en-US;q=0.9'), 'PK');
  assert.equal(countryFromAcceptLanguage('en-IN,hi-IN;q=0.8'), 'IN');
  assert.equal(countryFromAcceptLanguage('en-US,en;q=0.9'), null);
});
