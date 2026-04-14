import { describe, it, expect } from 'vitest';
import { parseMasterPlaylist } from './parser.js';
import { PlaylistParseError } from '../errors/AppError.js';

// Minimal but realistic Twitch master playlist fixture
const SAMPLE_PLAYLIST = `#EXTM3U
#EXT-X-TWITCH-INFO:NODE="video-edge-123",MANIFEST-NODE-TYPE="weaver_cluster"
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="chunked",NAME="1080p60 (source)",AUTOSELECT=YES,DEFAULT=YES
#EXT-X-STREAM-INF:BANDWIDTH=8111528,CODECS="avc1.64002A,mp4a.40.2",RESOLUTION=1920x1080,VIDEO="chunked",FRAME-RATE=60.000
https://vod.example.com/chunked/index-dvr.m3u8
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="720p60",NAME="720p60",AUTOSELECT=YES,DEFAULT=YES
#EXT-X-STREAM-INF:BANDWIDTH=5013888,CODECS="avc1.4D0028,mp4a.40.2",RESOLUTION=1280x720,VIDEO="720p60",FRAME-RATE=60.000
https://vod.example.com/720p60/index-dvr.m3u8
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="480p30",NAME="480p30",AUTOSELECT=YES,DEFAULT=NO
#EXT-X-STREAM-INF:BANDWIDTH=1427928,CODECS="avc1.4D001F,mp4a.40.2",RESOLUTION=852x480,VIDEO="480p30",FRAME-RATE=30.000
https://vod.example.com/480p30/index-dvr.m3u8
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="audio_only",NAME="audio only",AUTOSELECT=NO,DEFAULT=NO
#EXT-X-STREAM-INF:BANDWIDTH=192000,CODECS="mp4a.40.2",VIDEO="audio_only"
https://vod.example.com/audio_only/index-dvr.m3u8
`;

describe('parseMasterPlaylist', () => {
  it('parses all variants', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants).toHaveLength(4);
  });

  it('extracts the correct human-readable name via GROUP-ID → EXT-X-MEDIA lookup', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants[0]!.name).toBe('1080p60 (source)');
    expect(variants[1]!.name).toBe('720p60');
    expect(variants[3]!.name).toBe('audio only');
  });

  it('parses bandwidth correctly', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants[0]!.bandwidth).toBe(8111528);
    expect(variants[2]!.bandwidth).toBe(1427928);
  });

  it('parses resolution correctly', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants[0]!.resolution).toBe('1920x1080');
    expect(variants[1]!.resolution).toBe('1280x720');
  });

  it('sets resolution to null for audio-only', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants[3]!.resolution).toBeNull();
  });

  it('parses frame rate', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants[0]!.frameRate).toBeCloseTo(60.0);
    expect(variants[2]!.frameRate).toBeCloseTo(30.0);
  });

  it('parses URLs correctly', () => {
    const variants = parseMasterPlaylist(SAMPLE_PLAYLIST);
    expect(variants[0]!.url).toBe('https://vod.example.com/chunked/index-dvr.m3u8');
  });

  it('throws PlaylistParseError for non-M3U8 content', () => {
    expect(() => parseMasterPlaylist('<html>not a playlist</html>')).toThrow(PlaylistParseError);
  });

  it('throws PlaylistParseError when no variants are present', () => {
    expect(() => parseMasterPlaylist('#EXTM3U\n#EXT-X-TARGETDURATION:10\n')).toThrow(
      PlaylistParseError
    );
  });
});
