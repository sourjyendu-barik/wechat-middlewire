const User = require("../models/db.users");
const secret_access_key = process.env.JWT_SECRET_ACCESS;
const secret_refresh_key = process.env.JWT_SECRET_REFRESH;
const jwt = require("jsonwebtoken");
//access token will stored in memory for 15min
const createAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    secret_access_key,
    { expiresIn: "15m" },
  );
};
//refresh token will store for 30days
const createRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    secret_refresh_key,
    { expiresIn: "30d" },
  );
};

const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "User name or password is missing." });
    }
    const exist = await User.findOne({ username });
    if (exist) {
      return res
        .status(400)
        .json({ success: false, message: "The user already exists." });
    }
    const user = new User({ username, password });
    await user.save();
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   maxAge: 30 * 24 * 60 * 60 * 1000,
    // });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return res.status(201).json({
      success: true,
      message: "user registered successfully",
      accessToken,
      username,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error while register new user",
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "User name or password is missing." });
    }
    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "The user is not found" });
    }
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Password incorrect" });
    }
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   maxAge: 30 * 24 * 60 * 60 * 1000,
    // });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return res.status(200).json({
      success: true,
      message: "Login successfull",
      accessToken,
      username,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error while login",
      message: error.message,
    });
  }
};

const refresh = (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh Token not found plese login.",
      });
    }
    const decoded = jwt.verify(refreshToken, secret_refresh_key);
    const newAccessToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      secret_access_key,
      {
        expiresIn: "15m",
      },
    );

    return res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token. Please login again.",
    });
  }
};

const logout = (req, res) => {
  try {
    //clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    return res
      .status(200)
      .json({ success: true, message: "Logout successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};
module.exports = { register, login, refresh, logout };
