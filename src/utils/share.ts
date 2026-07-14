// The web join route (next-portfolio /buzzed/join/[code]). Sending the CODE alone is useless over text —
// the recipient has to know where to type it — so the link is what gets shared.
const WEB_URL = 'https://brainerd.dev';

export const buzzedJoinUrl = (joinCode: string): string => `${WEB_URL}/buzzed/join/${joinCode}`;

export type ShareResult = 'shared' | 'copied' | 'failed';

// iOS gives us the native share sheet (text, mail, AirDrop) via the Web Share API, which is the whole
// point on a phone. It is NOT guaranteed to exist in a WKWebView — and it rejects if the user just
// dismisses the sheet — so the clipboard is the fallback rather than an afterthought.
export const shareJoinLink = async (joinCode: string, gameName: string): Promise<ShareResult> => {
  const url = buzzedJoinUrl(joinCode);

  if (navigator.share) {
    try {
      await navigator.share({ title: gameName, text: `Join "${gameName}" on Buzzed`, url });
      return 'shared';
    } catch {
      // Dismissing the sheet rejects too, so falling through to the clipboard here would silently copy
      // when the user meant to cancel. Report it and let the caller say nothing.
      return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
};
