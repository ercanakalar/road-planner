import { nextPair } from './useWaypointPair';

describe('nextPair', () => {
  it('picks the first stop as A', () => {
    expect(nextPair([], 'a')).toEqual(['a']);
  });

  it('picks the second stop as B, after A', () => {
    // Order carries the labels, so this is not a set.
    expect(nextPair(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('unpicks a stop that is already in the pair', () => {
    expect(nextPair(['a', 'b'], 'a')).toEqual(['b']);
    expect(nextPair(['a', 'b'], 'b')).toEqual(['a']);
  });

  it('drops the oldest when a third is picked', () => {
    // The alternative is ignoring the tap, which reads as the list being stuck.
    expect(nextPair(['a', 'b'], 'c')).toEqual(['b', 'c']);
  });

  it('keeps promoting on each further pick', () => {
    const pair = ['a', 'b'];

    expect(nextPair(nextPair(pair, 'c'), 'd')).toEqual(['c', 'd']);
  });

  it('re-picking the one just unpicked puts it back as B', () => {
    expect(nextPair(nextPair(['a', 'b'], 'a'), 'a')).toEqual(['b', 'a']);
  });
});
