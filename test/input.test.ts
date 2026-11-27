import { afterEach, describe, expect, it } from 'vitest';
import { keyName, normalize, setLayout } from '../src/input';

/** A fake keyboard event: what the key types (key) and where it sits (code). */
const keyEvent = (key: string, code?: string) => ({ key, code }) as unknown as Parameters<typeof normalize>[0];

describe('keyboard layouts (e.g. AZERTY)', () => {
  afterEach(() => setLayout({}));

  it('keys go by where they sit, so the key in the Z spot is Z on any layout', () => {
    expect(normalize(keyEvent('w', 'KeyZ'))).toBe('z');
    expect(normalize(keyEvent('a', 'KeyQ'))).toBe('q');
  });

  it('digits, space, arrows and Enter go by the physical key too', () => {
    expect(normalize(keyEvent('&', 'Digit1'))).toBe('1');
    expect(normalize(keyEvent(' ', 'Space'))).toBe(' ');
    expect(normalize(keyEvent('ArrowUp', 'ArrowUp'))).toBe('up');
    expect(normalize(keyEvent('Enter', 'NumpadEnter'))).toBe('enter');
  });

  it('without a code, the key itself is used', () => {
    expect(normalize(keyEvent('ArrowLeft'))).toBe('left');
    expect(normalize(keyEvent('X'))).toBe('x');
  });

  it('labels are QWERTY until the layout is known', () => {
    expect(keyName('z')).toBe('z');
    expect(keyName('ground-q')).toBe('ground-q');
  });

  it('then labels show what the keys type', () => {
    setLayout({ KeyZ: 'w', KeyQ: 'a', KeyW: 'z', KeyA: 'q' });
    expect(keyName('z')).toBe('ground-w');
    expect(keyName('ground-q')).toBe('A');
    expect(keyName('w')).toBe('z');
    expect(keyName('escape')).toBe('ESCAPE');
  });
});
