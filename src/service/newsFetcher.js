import axios from "axios";

import Article from "../models/ArticleStore.js";
import Creator from "../models/CreatorArticle.js";

import {
  BREAKING_KEYWORDS,
  CREATOR_NAMES,
  HAPPENING_KEYWORDS,
} from "../constants/keywords.js";

const CHUNK_SIZE = 15;

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

// GET YOUTUBE CHANNEL INFO
async function getYoutubeChannelInfo(channelHandle) {
  try {
    const cleanHandle = channelHandle.replace("@", "").replace(/\s+/g, "");

    const { data } = await axios.get(
      `https://www.youtube.com/@${cleanHandle}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },

        timeout: 10000,
      },
    );

    // CHANNEL ID
    const channelIdMatch =
      data.match(/"channelId":"(UC[^"]+)"/) ||
      data.match(/"externalId":"(UC[^"]+)"/) ||
      data.match(/https:\\\/\\\/www\.youtube\.com\\\/channel\\\/(UC[^\\"]+)/);

    // AVATAR
    const avatarMatch = data.match(/"avatar":\{"thumbnails":\[(.*?)\]\}/);

    let avatar = null;

    if (avatarMatch?.[1]) {
      const urls = [...avatarMatch[1].matchAll(/"url":"([^"]+)"/g)];

      if (urls.length) {
        avatar = urls[urls.length - 1][1];

        avatar = avatar.replace(/\\u0026/g, "&");

        avatar = avatar.replace(/=s\d+[^-]*/, "=s800");
      }
    }

    return {
      channelId: channelIdMatch?.[1] || null,

      avatar,
    };
  } catch (error) {
    console.log("channel info failed:", channelHandle);

    return {
      channelId: null,

      avatar: null,
    };
  }
}

// GET LATEST VIDEO FROM RSS
async function getLatestYoutubeVideo(channelId) {
  try {
    if (!channelId) {
      return null;
    }

    const { data } = await axios.get(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      {
        timeout: 10000,
      },
    );

    // VIDEO ID
    const videoIdMatch = data.match(/<yt:videoId>(.*?)<\/yt:videoId>/);

    // TITLE
    const titleMatch = data.match(/<entry>[\s\S]*?<title>(.*?)<\/title>/);

    // PUBLISHED
    const publishedMatch = data.match(/<published>(.*?)<\/published>/);

    if (!videoIdMatch?.[1]) {
      return null;
    }

    const videoId = videoIdMatch[1];

    return {
      videoId,

      title: titleMatch?.[1] || "",

      publishedAt: publishedMatch?.[1] || "",

      url: `https://www.youtube.com/watch?v=${videoId}`,

      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (error) {
    console.log("rss failed:", channelId);

    return null;
  }
}

export async function syncNewsFeed() {
  console.log("sync started...");

  const creatorChunks = chunkArray(CREATOR_NAMES, CHUNK_SIZE);

  // FETCH NEWS IN PARALLEL
  const responses = await Promise.all(
    creatorChunks.map((chunk) => {
      const creatorQuery = chunk
        .map((creator) => `"${creator.name}"`)
        .join(" OR ");

      const q = `
          (${creatorQuery})
          AND
          (
            youtube
            OR influencer
            OR creator
            OR instagram
          )
        `;

      return axios.get("https://newsapi.org/v2/everything", {
        params: {
          q,

          language: "en",

          sortBy: "publishedAt",

          pageSize: 100,

          apiKey: process.env.NEWS_API_KEY,
        },
      });
    }),
  );

  // MERGE ARTICLES
  const articles = responses.flatMap(
    (response) => response.data.articles || [],
  );

  const creatorMap = {};

  for (const article of articles) {
    const searchableText = `
      ${article.title || ""}
      ${article.description || ""}
      ${article.content || ""}
    `.toLowerCase();

    let matchedCreator = null;

    // FIND MATCHED CREATOR
    for (const creator of CREATOR_NAMES) {
      if (searchableText.includes(creator.name.toLowerCase())) {
        matchedCreator = creator;

        break;
      }
    }

    // SKIP IF NO MATCH
    if (!matchedCreator) {
      continue;
    }

    // BREAKING DETECTION
    const isBreaking = BREAKING_KEYWORDS.some((keyword) =>
      searchableText.includes(keyword),
    );

    // TRENDING SCORE
    let trendingScore = 10;

    if (isBreaking) {
      trendingScore += 50;
    }

    trendingScore += (article.title || "").length * 0.2;

    trendingScore += (article.description || "").split(" ").length * 0.1;

    // ALSO HAPPENING
    const isAlsoHappening = HAPPENING_KEYWORDS.some((keyword) =>
      searchableText.includes(keyword),
    );

    if (isAlsoHappening) {
      trendingScore += 20;
    }

    // SAVE ARTICLE
    await Article.findOneAndUpdate(
      {
        url: article.url,
      },
      {
        title: article.title,

        description: article.description,

        content: article.content,

        author: article.author,

        url: article.url,

        urlToImage: article.urlToImage,

        source: article.source,

        publishedAt: article.publishedAt,

        creatorName: matchedCreator.name,

        creatorChannel: matchedCreator.channelName,

        isBreaking,

        isAlsoHappening,

        trendingScore,
      },
      {
        upsert: true,

        returnDocument: "after",
      },
    );

    // CREATOR STATS
    if (!creatorMap[matchedCreator.name]) {
      creatorMap[matchedCreator.name] = {
        creator: matchedCreator,

        articleCount: 0,

        breakingCount: 0,

        score: 0,
      };
    }

    creatorMap[matchedCreator.name].articleCount += 1;

    creatorMap[matchedCreator.name].score += trendingScore;

    if (isBreaking) {
      creatorMap[matchedCreator.name].breakingCount += 1;
    }
  }

  // TOP CREATORS
  const sortedCreators = Object.values(creatorMap)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // SAVE CREATORS
  await Promise.all(
    sortedCreators.map(async (data) => {
      const creator = data.creator;

      // GET CHANNEL INFO
      const { channelId, avatar } = await getYoutubeChannelInfo(
        creator.channelName,
      );

      // GET RSS VIDEO
      const latestVideo = await getLatestYoutubeVideo(channelId);

      return Creator.findOneAndUpdate(
        {
          name: creator.name,
        },
        {
          name: creator.name,

          channelName: creator.channelName,

          channelId,

          image: avatar,

          rss_feed: latestVideo,

          articleCount: data.articleCount,

          breakingCount: data.breakingCount,

          trendingScore: data.score,
        },
        {
          upsert: true,

          returnDocument: "after",
        },
      );
    }),
  );

  console.log("news synced!!");

  return {
    success: true,

    totalArticles: articles.length,

    creators: sortedCreators.length,
  };
}
