import TestRenderer, { act } from 'react-test-renderer';

import usePagedOffset from './usePagedOffset';

const PAGE = 30;

const render = (initialQuestion: string) => {
  const seen: number[] = [];
  let loadNextPage!: () => void;
  let reset!: () => void;

  const Probe = ({ question }: { question: string }) => {
    const [offset, next, back] = usePagedOffset(question, PAGE);
    seen.push(offset);
    loadNextPage = next;
    reset = back;
    return null;
  };

  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<Probe question={initialQuestion} />);
  });

  return {
    seen,
    offset: () => seen[seen.length - 1],
    next: () => act(() => loadNextPage()),
    reset: () => act(() => reset()),
    ask: (question: string) =>
      act(() => tree.update(<Probe question={question} />)),
  };
};

describe('usePagedOffset', () => {
  it('starts at the first page', () => {
    expect(render('coast').offset()).toBe(0);
  });

  it('moves on by one page at a time', () => {
    const list = render('coast');

    list.next();
    expect(list.offset()).toBe(PAGE);

    list.next();
    expect(list.offset()).toBe(PAGE * 2);
  });

  it('goes back to the top when the question changes', () => {
    const list = render('coast');
    list.next();

    list.ask('mountains');

    expect(list.offset()).toBe(0);
  });

  it('never renders the old offset against the new question', () => {
    const list = render('coast');
    list.next();
    list.next();

    const before = list.seen.length;
    list.ask('mountains');

    expect(list.seen.slice(before)).not.toContain(PAGE * 2);
    expect(list.offset()).toBe(0);
  });

  it('stays put when the question is re-rendered unchanged', () => {
    const list = render('coast');
    list.next();

    list.ask('coast');

    expect(list.offset()).toBe(PAGE);
  });

  it('can be sent back to the top without changing the question', () => {
    const list = render('coast');
    list.next();

    list.reset();

    expect(list.offset()).toBe(0);
  });
});
