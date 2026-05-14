import mongoose from "mongoose";

const CreatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,

      unique: true,
    },

    channelName: {
      type: String,
    },

    channelId: {
      type: String,
    },

    image: {
      type: String,
    },

    articleCount: {
      type: Number,

      default: 0,
    },

    breakingCount: {
      type: Number,

      default: 0,
    },

    trendingScore: {
      type: Number,

      default: 0,
    },

    rss_feed: {
      videoId: String,

      title: String,

      url: String,

      thumbnail: String,

      publishedAt: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model("Creator", CreatorSchema);
