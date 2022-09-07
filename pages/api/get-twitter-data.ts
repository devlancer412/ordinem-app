import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const BEARER_TOKEN = process.env.NEXT_PUBLIC_TWITTER_BEARER;
const URL = `http://api.twitter.com/1.1/users/show.json`;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user_id = req.body.user_id ?? req.query.user_id;
  const params = { user_id };

  if (!user_id || !user_id.trim()) {
    res.json({
      status: "error",
      error: "Enter a valid id",
    });

    return;
  }

  try {
    const result = await axios.get(URL, {
      params,
      headers: {
        authorization: `Bearer ${BEARER_TOKEN}`,
      },
    });

    const { screen_name, name, followers_count, friends_count } = result.data;

    res.json({
      status: "ok",
      data: {
        followers: followers_count,
        following: friends_count,
        screen_name,
        name,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.json({
      status: "error",
      data: error.message || "Something went wrong",
    });
  }
};

export default handler;
