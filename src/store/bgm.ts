import { atom } from 'nanostores';

/**
 * BGM panel uses a separate store (not $activeModal) because music playback
 * should persist when other modals open — hiding the panel UI while keeping
 * audio playing is intentional.
 */
export const $bgmPanelOpen = atom(false);
export const $bgmActiveTab = atom(0);

export function toggleBgmPanel() {
  $bgmPanelOpen.set(!$bgmPanelOpen.get());
}

export function openBgmPanel() {
  $bgmPanelOpen.set(true);
}

export function closeBgmPanel() {
  $bgmPanelOpen.set(false);
}

export function setBgmActiveTab(index: number) {
  $bgmActiveTab.set(Math.max(0, index));
}
