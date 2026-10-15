import test from 'node:test';
import assert from 'node:assert/strict';
import { baumhoehe, durchmesser, neigung } from '../src/baum/handyBerechnung.js';

const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
test('height uses the signed difference of top and base tangents', () => {
  nah(baumhoehe('20', '-10', '45'), 20 * (1 + Math.tan(Math.PI / 18)));
  nah(baumhoehe('12,5', '0', '45'), 12.5);
  nah(baumhoehe('20', '10', '45'), 20 * (1 - Math.tan(Math.PI / 18)));
  nah(baumhoehe('20', '-45', '-10'), 20 * (1 - Math.tan(Math.PI / 18)));
});
test('rejects incomplete, nonfinite, reversed and near-vertical measurements', () => {
  for (const args of [['', 0, 45], [0, 0, 45], [-5, 0, 45], [20, '', 45], [20, 0, ''], [20, 45, 10], [20, 10, 10], [20, -85, 45], [20, 0, 85], [Infinity, 0, 45]]) {
    assert.equal(baumhoehe(...args), null);
  }
});
test('rear-camera elevation follows upright portrait phone tilt', () => {
  nah(neigung(90, 0), 0);
  nah(neigung(120, 0), 30);
  nah(neigung(60, 0), -30);
  for (const args of [[null, 0], [90, null], [90, 40], [-90, 0], [NaN, 0]]) assert.equal(neigung(...args), null);
});
test('circumference gives diameter and rejects invalid values', () => {
  nah(durchmesser(String(30 * Math.PI)), 30);
  nah(durchmesser('94,2'), 94.2 / Math.PI);
  for (const u of ['', 'abc', 0, -1, Infinity]) assert.equal(durchmesser(u), null);
});
