import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatValue, formatSign } from '../src/format.js';

test('formatValue adds the unit', () => {
  assert.equal(formatValue(458949, { format: 'int', unit: 'people' }), '458,949 people');
  assert.equal(formatValue(960, { format: 'int', unit: 'km²' }), '960 km²');
  assert.equal(formatValue(81, { format: 'dec1', unit: 'years' }), '81.0 years');
  assert.equal(formatValue(9913, { format: 'usd', unit: 'US$' }), '$9,913');
});

test('big dollar amounts read in words', () => {
  assert.equal(formatNumber(102377501186, 'usd-big'), '$102 billion');
  assert.equal(formatNumber(19673291004, 'usd-big'), '$19.7 billion');
  assert.equal(formatNumber(690456807, 'usd-big'), '$690 million');
  assert.equal(formatNumber(1218600000000, 'usd-big'), '$1.22 trillion');
  assert.equal(formatNumber(1e12, 'usd-big'), '$1 trillion');
});

test('signs use short forms for round limits', () => {
  assert.equal(formatSign(500000, 'int'), '500K');
  assert.equal(formatSign(100000000, 'int'), '100M');
  assert.equal(formatSign(4000000, 'int'), '4M');
  assert.equal(formatSign(20000000000, 'usd-big'), '$20B');
  assert.equal(formatSign(1000000000000, 'usd-big'), '$1T');
  assert.equal(formatSign(10000, 'usd'), '$10K');
  assert.equal(formatSign(1000, 'int'), '1,000');
  assert.equal(formatSign(40000, 'int'), '40K');
  assert.equal(formatSign(84.5, 'dec1'), '84.5');
  assert.equal(formatSign(80, 'dec1'), '80');
  assert.equal(formatSign(1250, 'int'), '1,250');
});
