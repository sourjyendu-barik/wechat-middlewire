const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    // 1. Check for token in BOTH Cookies and Headers
    // Note: 'accessToken' should match the name you used in res.cookie()
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    // console.log("cookie", req.cookies);
    console.log(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }
    // 2. Verify the token
    const decodedValue = jwt.verify(token, process.env.JWT_SECRET_ACCESS);

    // 3. Attach user to request
    req.user = decodedValue;
    next();
  } catch (error) {
    console.error("JWT Error:", error.message);

    // Handle expired tokens specifically if you want
    const message =
      error.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ success: false, message });
  }
};

module.exports = auth;
