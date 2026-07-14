export interface YoutubePlaylist {
  id: string;
  title: string;
  itemCount: number;
  thumbnail?: string;
}

export interface YoutubePlaylistItem {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
}

export interface YoutubeSearchPage {
  items: YoutubePlaylistItem[];
  nextPageToken?: string;
}
