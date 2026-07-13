// True in the iOS (mobile) build, false on the macOS/Windows desktop build. The WKWebView UA on iPhone
// carries "iPhone"; the desktop webviews report "Macintosh"/"Windows". Static for the app's lifetime.
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
