import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter


def get_transcript(video_id):
    try:
        # Try German first (user preference), then English
        transcript = YouTubeTranscriptApi().fetch(video_id, languages=["de", "en"])
        formatter = TextFormatter()
        transcript_text = formatter.format_transcript(transcript)
        return {"success": True, "text": transcript_text}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No video ID provided"}))
        sys.exit(1)

    video_id = sys.argv[1]
    result = get_transcript(video_id)
    print(json.dumps(result))
