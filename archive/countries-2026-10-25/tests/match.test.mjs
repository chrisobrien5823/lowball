import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, editDistance, matchAnswer } from '../src/match.js';

const answers = [
  { name: 'Saint Kitts and Nevis', value: 47000, aliases: ['St Kitts and Nevis', 'St Kitts'] },
  { name: 'São Tomé and Príncipe', value: 230000, aliases: ['Sao Tome'] },
  { name: 'Malta', value: 535000 },
  { name: 'Mali', value: 23000000 },
  { name: 'Bahamas', value: 410000, aliases: ['The Bahamas'] },
  { name: 'Iceland', value: 390000 },
  { name: 'Ireland', value: 5200000 },
];

test('normalize strips case, accents, punctuation and a leading "the"', () => {
  assert.equal(normalize('  São Tomé & Príncipe! '), 'sao tome and principe');
  assert.equal(normalize('The Bahamas'), 'bahamas');
  assert.equal(normalize('St. Kitts'), 'st kitts');
});

test('editDistance counts adjacent swaps as one edit', () => {
  assert.equal(editDistance('malta', 'mlata'), 1);
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.equal(editDistance('abc', 'xyz12345', 2), 3);
});

test('exact name and alias matches', () => {
  assert.equal(matchAnswer('malta', answers).answer.name, 'Malta');
  assert.equal(matchAnswer('St. Kitts', answers).answer.name, 'Saint Kitts and Nevis');
  assert.equal(matchAnswer('sao tome and principe', answers).answer.name, 'São Tomé and Príncipe');
  assert.equal(matchAnswer('the bahamas', answers).exact, true);
  assert.equal(matchAnswer('Ice land', answers).answer.name, 'Iceland');
});

test('light typos are forgiven', () => {
  assert.equal(matchAnswer('Bahamsa', answers).answer.name, 'Bahamas');
  assert.equal(matchAnswer('Icelnd', answers).exact, false);
  assert.equal(matchAnswer('saint kits and nevis', answers).answer.name, 'Saint Kitts and Nevis');
});

test('short names must be exact', () => {
  assert.equal(matchAnswer('Mlai', answers), null);
  assert.equal(matchAnswer('Mali', answers).answer.name, 'Mali');
});

test('a dropped letter from a 5-letter name is forgiven', () => {
  const small = [{ name: 'Palau', value: 1 }, { name: 'Nauru', value: 2 }];
  assert.equal(matchAnswer('Palu', small).answer.name, 'Palau');
  assert.equal(matchAnswer('Naru', small).answer.name, 'Nauru');
});

test('ties go to the name with a dropped letter', () => {
  const africa = [{ name: 'Niger', value: 1 }, { name: 'Nigeria', value: 2 }, { name: 'Burundi', value: 3 }, { name: 'Brunei', value: 4 }];
  assert.equal(matchAnswer('Nigera', africa).answer.name, 'Nigeria');
  assert.equal(matchAnswer('Brundi', africa).answer.name, 'Burundi');
});

test('ambiguous typos and junk are not matched', () => {
  // "Ieland" is one edit from both Iceland and Ireland.
  assert.equal(matchAnswer('Ieland', answers), null);
  assert.equal(matchAnswer('Atlantis', answers), null);
  assert.equal(matchAnswer('   ', answers), null);
});
