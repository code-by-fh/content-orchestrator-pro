import { YoutubeTranscript } from 'youtube-transcript';

export const extractYoutubeTranscript = async (videoId: string): Promise<string> => {
    try {
        console.log('Fetching transcript for video ID:', videoId);
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        console.log('Transcript items:', transcriptItems);
        return transcriptItems.map((item) => item.text).join(' ');
    } catch (error) {
        throw new Error('Failed to fetch YouTube transcript');
    }
};

export const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};
