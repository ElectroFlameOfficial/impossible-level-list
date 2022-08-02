export interface ImpossibleLevel {
    id: string,
    position: number,
    name: string,
    fps: number,
    level_id: string,
    gd_version: string,
    yt_videoID: string,
    creators_short: string,
    creators_full: string[],
    tags: string[],
    uploader: string,
    wr_min_percent: string,
    wr: string,
    wr_yt: string,
    marked_for_removal: boolean,
    annotated: boolean,
    marking_reason: string
}
