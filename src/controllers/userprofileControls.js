import User from "../models/User.js";

// CREATE USER
export const createUser = async (req, res) => {
  try {
    const {
      firebaseUid,
      username,
      firstName,
      lastName,
      email,
      profileImage,
      location,
    } = req.body;

    // check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { firebaseUid }],
    }).lean();

    if (existingUser) {
      let message = "User already exists";

      if (existingUser.email === email) {
        message = "Email already in use";
      } else if (existingUser.username === username) {
        message = "Username already taken";
      } else if (existingUser.firebaseUid === firebaseUid) {
        message = "UID already exists";
      }

      return res.status(400).json({
        success: false,
        message,
      });
    }

    const user = await User.create({
      firebaseUid,
      username,
      firstName,
      lastName,
      email,
      profileImage,
      location,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE USER
export const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.id }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };

    // prevent firebaseUid update
    if (updates.firebaseUid) {
      delete updates.firebaseUid;
    }

    console.log(updates);
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.id },
      updates,
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      firebaseUid: req.params.id,
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
