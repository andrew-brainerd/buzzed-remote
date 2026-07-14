// The web join route. A bare code is useless over text — the recipient wouldn't know where to type it.
const WEB_URL = 'https://brainerd.dev';

export const buzzedJoinUrl = (joinCode: string): string => `${WEB_URL}/buzzed/join/${joinCode}`;

export type ShareResult = 'shared' | 'copied' | 'failed';

// `navigator.share` isn't guaranteed in a WKWebView, so the clipboard is a real fallback.
export const shareJoinLink = async (joinCode: string, gameName: string): Promise<ShareResult> => {
  const url = buzzedJoinUrl(joinCode);

  if (navigator.share) {
    try {
      await navigator.share({ title: gameName, text: `Join "${gameName}" on Buzzed`, url });
      return 'shared';
    } catch {
      // A dismissal rejects too, so falling through to the clipboard would "copy" on a cancel.
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
