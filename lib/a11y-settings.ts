/** הגדרות נגישות (localStorage) */

export const A11Y_KEY = 'auraclean_a11y';

export const A11Y_DEFAULTS = {
  fontScale: 1,
  contrast: false,
  links: false,
  noAnim: false,
  buttonSounds: true,
};

export type A11yState = typeof A11Y_DEFAULTS;

export function loadA11ySettings(): A11yState {
  if (typeof window === 'undefined') return { ...A11Y_DEFAULTS };
  try {
    return { ...A11Y_DEFAULTS, ...JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') };
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function isButtonSoundEnabled(): boolean {
  if (typeof window === 'undefined') return A11Y_DEFAULTS.buttonSounds;
  return loadA11ySettings().buttonSounds;
}
