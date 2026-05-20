import User from "../models/User.js";

export const generateUniqueUsername = async (email) => {
  let username = "";
  let exists = true;

  while (exists) {
    const base = email
      ?.split("@")[0]
      ?.replace(/[^a-zA-Z0-9]/g, "")
      ?.slice(0, 8);

    const random = Math.floor(1000 + Math.random() * 9000);

    username = `${base}${random}`;

    exists = await User.exists({
      username,
    });
  }

  return username;
};
