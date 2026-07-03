import { YouTubeVideo } from "@/types";
import { YOUTUBE_API_URL, YOUTUBE_MAX_RESULTS } from "./constants";

/**
 * Search for videos on a specific YouTube channel.
 * Uses YouTube Data API v3 search.list endpoint.
 * Returns empty array if API key is missing or request fails (graceful fallback).
 */
export async function searchVideos(
  query: string,
  channelId: string,
  maxResults: number = YOUTUBE_MAX_RESULTS
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY not set — skipping YouTube search");
    return [];
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      channelId: channelId,
      maxResults: String(maxResults),
      type: "video",
      order: "relevance",
      key: apiKey,
    });

    const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube API error:", response.status, errorText);
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          description: string;
          thumbnails: { medium?: { url: string }; default?: { url: string } };
          publishedAt: string;
        };
      }): YouTubeVideo => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail:
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url ||
          "",
        publishedAt: item.snippet.publishedAt,
      })
    );
  } catch (error) {
    console.error("YouTube search failed:", error);
    return [];
  }
}
