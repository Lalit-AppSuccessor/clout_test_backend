import express from "express";

import Article from "../models/ArticleStore.js";
import Creator from "../models/CreatorArticle.js";

const router = express.Router();

// FEED API
router.get("/feed", async (req, res) => {
  try {
    const breakingNews = await Article.find({
      isBreaking: true,
    })
      .sort({
        publishedAt: -1,
      })
      .limit(20);

    const normalNews = await Article.find({
      isBreaking: false,
    })
      .sort({
        publishedAt: -1,
      })
      .limit(50);

    const happeningNews = await Article.find({
      isAlsoHappening: true,
    })
      .sort({
        publishedAt: -1,
      })
      .limit(50);

    const topInfluencers = await Creator.find()
      .sort({
        trendingScore: -1,
      })
      .limit(10);

    const avgTrendingScore =
      normalNews.reduce((sum, item) => sum + (item.trendingScore || 0), 0) /
      (normalNews.length || 1);

    const topNewsRankCard = normalNews.filter(
      (item) => item.trendingScore >= avgTrendingScore,
    );

    res.json({
      success: true,

      breakingNews,

      normalNews,

      happeningNews,

      topNewsRankCard,

      influencers: topInfluencers,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
});

router.post("/:id/stance", async (req, res) => {
  try {
    const { id } = req.params;
    const { stance } = req.body;
    if (!id && !stance) {
      return res.status(400).json({
        success: false,
        message: "Article ID and stance are required",
      });
    }

    const article = await Article.findOneAndUpdate(
      { _id: id },
      { $inc: { [`stances.${stance}`]: 1 } },
      { returnDocument: "after" },
    );
    console.log(article, id, stance);

    res.json({
      success: true,
      article,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
});

export default router;
